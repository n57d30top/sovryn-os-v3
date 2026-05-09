# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-09)

## Corpus Check
- 191 files · ~956,795 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4343 nodes · 14922 edges · 48 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 3670 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `writeJson()` - 555 edges
2. `nowIso()` - 384 edges
3. `hashEvidence()` - 228 edges
4. `hashEvidence()` - 219 edges
5. `hashEvidence()` - 218 edges
6. `executeCli()` - 165 edges
7. `ScienceService` - 101 edges
8. `LabService` - 88 edges
9. `withEvidenceHash()` - 78 edges
10. `readJson()` - 77 edges

## Surprising Connections (you probably didn't know these)
- `readJsonOrText()` --calls--> `readJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/nobel-discovery-portfolio.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/fs.ts
- `replayDiagnosticRepo()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/e2e.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `factoryFixtureRun()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts
- `factoryFixtureRun()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (264): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+256 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (160): withHash(), writePilotFixture(), withCandidateHash(), buildScientificMemorySummary(), toPublicCorpusExportModel(), buildCorpusGraph(), stableId(), EnergyRecordAuditorResearchService (+152 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (158): configPath(), ensureGitignore(), initConfig(), readText(), createStore(), discoverVerifyCommands(), exists(), readPackageJson() (+150 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (190): scienceCommand(), aggregateMetrics(), analyzeSafety(), assertDatasetCandidateSafe(), assertReproductionPlanRunnable(), assertSafeScope(), average(), buildAblationAnalysis() (+182 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (166): acceptedPackageHardSeed(), arrayLength(), AutonomousDiscoveryDaemonService, baseHardSeed(), buildAnomalyFamilies(), buildCandidateIdeas(), buildCounterexampleResults(), buildDaemonKillWeek() (+158 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (135): factoryPriorArtFixtures(), factorySourceReadingFixtures(), patentSourceReadingFixture(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists() (+127 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (76): unsafeDomainText(), criticalCheck(), labCommand(), analysisOperations(), auditText(), buildCapabilityEdges(), buildSafetyScope(), candidateInstruments() (+68 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (82): auditFormalPublicText(), AutomataPatternExplorer, baselineFor(), BoundedToFormalBridge, candidateFixture(), ConjectureCandidateScorer, conjectureFamilyFixture(), CounterexampleSearchRunner (+74 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (71): arrayOfStrings(), buildDuplicateMap(), comparableTokens(), corpusGate(), CorpusService, exists(), explainSummary(), isRecord() (+63 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (102): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+94 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (69): auditFromGates(), buildBaselineTools(), buildExternalClaimBindings(), buildHoldoutTasks(), buildMethodIdeas(), buildProblemCandidates(), exists(), ExternalProductionService (+61 more)

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (121): booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildSearchIndex(), buildVersionGroups(), compactSummary(), comparableTokens(), compareShowcaseCandidates() (+113 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (70): accelerationFactorForOS15Target(), auditOS15PublicText(), average(), buildOS15ScaleRun(), caveatsForOS15Target(), ClassHardeningPlanner, classLimitations(), CorpusFacetedIndexExporter (+62 more)

### Community 13 - "Community 13"
Cohesion: 0.04
Nodes (41): AccelerationScoreService, auditRoutePublicText(), average(), buildBatch(), classificationReasons(), CrossDomainEvidenceRoutingService, CrossDomainTargetClassifier, DeepValidationRouter (+33 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (64): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+56 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (49): loadConfig(), readJson(), readPilot(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking() (+41 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (57): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), isDependencyOrCachePath() (+49 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (51): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+43 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (23): temporalCommand(), appendJsonArray(), auditTemporalPublicText(), ClassSpecificFalsifierRunner, ensureTemporalDirs(), HorizonWindowStressRunner, readOptional(), readOptionalText() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (23): classifyFundCandidate(), fundClassCountsForEinsteinNobelDiscoveryScore(), fundClassRationale(), nobelReadinessCommand(), auditNobelReadinessPublicText(), categoryCounts(), fileExists(), hasNobelReadinessArtifacts() (+15 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (38): arrayLength(), benchmarkEvidenceTable(), buildCorpusPatternScan(), calibratePredictions(), compareTheories(), conceptCandidates(), containsFakeTheoryClaim(), gate() (+30 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (28): strategyCommand(), buildExecutionCycle(), clampInt(), exists(), gate(), listJsonFiles(), numberValue(), opportunitiesForSeed() (+20 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (44): auditFromGates(), buildClaimBindings(), buildExternalTargets(), buildFailureModes(), buildImprovementHypotheses(), buildPreparedDatasets(), buildPreregistration(), buildTools() (+36 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (37): auditFromGates(), buildBenchmarkSources(), buildBenchmarkTasks(), buildCandidateMethods(), buildClaimEvidenceBindings(), exists(), frontierPaperFiles(), frontierPaperSummary() (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (24): auditNobelPublicText(), DiscoveryCandidateScorer, DiscoveryHypothesisGenerator, domain(), domainFromHypothesis(), ensureNobelDirs(), executionFor(), HighImpactDomainSelector (+16 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (36): artifactsForRoute(), assertSafeGoal(), auditScientificClaimText(), average(), boundedScientistLimitations(), buildMemoryUpdate(), candidate(), containsUnsafeDomainClaim() (+28 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (30): artifactConsumerGaps(), artifactProducerGaps(), artifactTokens(), artifactTokensOverlap(), buildProposedFixes(), domainFromOpportunity(), exists(), firstRecord() (+22 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (22): arrayOf(), auditValidationPublicText(), BlindHoldoutSelector, CounterexampleSearchService, countJsonFiles(), DiscoveryValidationService, ensureValidationDirs(), existsJson() (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 29 - "Community 29"
Cohesion: 0.1
Nodes (19): repoCommand(), classifyFixture(), appendJsonArray(), auditRepoPublicText(), DependencyPinningAnalyzer, ensureRepoDirs(), EnvironmentSpecificityAnalyzer, ExamplePathAnalyzer (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (16): detectDomain(), DiscoveryService, exists(), gate(), publicDisclaimer(), renderBreakthroughReport(), renderCampaignReport(), renderDiscoveryReport() (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (27): FailingRealSourceFixtureAdapter, adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheRoot(), clampInt() (+19 more)

### Community 32 - "Community 32"
Cohesion: 0.37
Nodes (2): NodeAlphaToolchainManager, withHash()

### Community 33 - "Community 33"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (1): run()

### Community 35 - "Community 35"
Cohesion: 0.2
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

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0):

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 36`** (2 nodes): `describeOpenInvention()`, `index.js`
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
- **Thin community `Community 45`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `writeJson()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 23`, `Community 27`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 554 inferred relationships involving `writeJson()` (e.g. with `theoryFixture()` and `writePriorResult()`) actually correct?**
  _`writeJson()` has 554 INFERRED edges - model-reasoned connections that need verification._
- **Are the 383 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 383 INFERRED edges - model-reasoned connections that need verification._
- **Are the 216 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 216 INFERRED edges - model-reasoned connections that need verification._
- **Are the 217 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 217 INFERRED edges - model-reasoned connections that need verification._