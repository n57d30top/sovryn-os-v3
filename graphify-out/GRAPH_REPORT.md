# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-07)

## Corpus Check
- 183 files · ~810,677 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3928 nodes · 13253 edges · 51 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 3183 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `writeJson()` - 517 edges
2. `nowIso()` - 382 edges
3. `hashEvidence()` - 228 edges
4. `hashEvidence()` - 219 edges
5. `executeCli()` - 163 edges
6. `ScienceService` - 101 edges
7. `LabService` - 88 edges
8. `withEvidenceHash()` - 77 edges
9. `readJson()` - 77 edges
10. `runCommand()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `readJsonOrText()` --calls--> `readJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/nobel-discovery-portfolio.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/fs.ts
- `replayDiagnosticRepo()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/e2e.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts
- `makeTargetRepo()` --calls--> `runCommand()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-beta.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/adapters/shell/command.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `factoryFixtureRun()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (222): initializedRepo(), createOperationsFixture(), createPilotAllFixture(), must(), operationsFixture(), pilotAllFixture(), betaFixture(), createBetaFixture() (+214 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (163): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+155 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (188): writeJson(), scienceCommand(), aggregateMetrics(), analyzeSafety(), assertDatasetCandidateSafe(), assertReproductionPlanRunnable(), assertSafeScope(), average() (+180 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (142): buildScientificMemorySummary(), toPublicCorpusExportModel(), buildCorpusGraph(), commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset() (+134 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (109): exists(), InventionService, slugify(), titleFromBrief(), phaseEvidenceFileName(), writePhaseEvidence(), ArxivSearchAdapter, asArray() (+101 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (71): criticalCheck(), labCommand(), analysisOperations(), auditText(), buildCapabilityEdges(), buildSafetyScope(), candidateInstruments(), candidatePackages() (+63 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (83): auditFormalPublicText(), AutomataPatternExplorer, baselineFor(), BoundedToFormalBridge, candidateFixture(), ConjectureCandidateScorer, ConjectureFamilyBuilder, conjectureFamilyFixture() (+75 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (72): arrayOfStrings(), buildDuplicateMap(), comparableTokens(), corpusGate(), CorpusService, exists(), explainSummary(), isRecord() (+64 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (70): concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent(), hashesBound() (+62 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (70): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+62 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (42): AccelerationScoreService, auditRoutePublicText(), average(), buildBatch(), classificationReasons(), CrossDomainEvidenceRoutingService, CrossDomainTargetClassifier, DeepValidationRouter (+34 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (77): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+69 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (64): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+56 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (36): auditFromGates(), baselinesForDomain(), candidatesForDomain(), challengeTask(), clampInt(), exists(), FieldGradeService, fieldGradeSummary() (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (87): booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildSearchIndex(), buildVersionGroups(), comparableTokens(), compareShowcaseCandidates(), compareVersionedResults() (+79 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (34): realityGradeCommand(), sourcesCommand(), auditFromGates(), baselinesForDomain(), benchmarkTask(), clampInt(), dedupeBy(), exists() (+26 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (40): osCommand(), accelerationFactorForOS15Target(), auditOS15PublicText(), average(), buildOS15ScaleRun(), caveatsForOS15Target(), ClassHardeningPlanner, classLimitations() (+32 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (40): theoryCommand(), arrayLength(), benchmarkEvidenceTable(), buildCorpusPatternScan(), calibratePredictions(), compareTheories(), conceptCandidates(), containsFakeTheoryClaim() (+32 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (30): knowledgeCommand(), buildContradictions(), buildEvidenceEdges(), buildMethodAtlas(), buildNextExperiments(), claimsForSource(), clampInt(), dedupeBy() (+22 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (28): strategyCommand(), buildExecutionCycle(), clampInt(), exists(), gate(), listJsonFiles(), numberValue(), opportunitiesForSeed() (+20 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (45): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), isDependencyOrCachePath() (+37 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (22): temporalCommand(), appendJsonArray(), auditTemporalPublicText(), ClassSpecificFalsifierRunner, ensureTemporalDirs(), HorizonWindowStressRunner, readOptional(), readOptionalText() (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (46): auditFromGates(), buildClaimBindings(), buildExternalTargets(), buildFailureModes(), buildImprovementHypotheses(), buildPreparedDatasets(), buildPreregistration(), buildTools() (+38 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (38): artifactsForRoute(), assertSafeGoal(), auditScientificClaimText(), average(), boundedScientistLimitations(), buildMemoryUpdate(), candidate(), containsUnsafeDomainClaim() (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (40): auditFromGates(), buildBaselineTools(), buildExternalClaimBindings(), buildHoldoutTasks(), buildMethodIdeas(), buildProblemCandidates(), exists(), ExternalProductionService (+32 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (38): auditFromGates(), buildBenchmarkSources(), buildBenchmarkTasks(), buildCandidateMethods(), buildClaimEvidenceBindings(), exists(), frontierPaperFiles(), frontierPaperSummary() (+30 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (25): nobelCommand(), auditNobelPublicText(), DiscoveryCandidateScorer, DiscoveryHypothesisGenerator, domain(), domainFromHypothesis(), ensureNobelDirs(), executionFor() (+17 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (22): auditReviewPublicText(), decisionFromReceipt(), ensureReviewDirs(), EvidenceReceiptService, executionNeedForFamily(), ExecutionWavePlanner, ExternalReviewScientistService, ExternalTargetMiner (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (17): nobelReadinessCommand(), auditNobelReadinessPublicText(), fileExists(), hasNobelReadinessArtifacts(), NobelReadinessCandidateSearchService, NobelReadinessCriteriaService, NobelReadinessDomainSelector, NobelReadinessExecutionRunner (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (17): detectDomain(), DiscoveryService, exists(), gate(), publicDisclaimer(), renderBreakthroughReport(), renderCampaignReport(), renderDiscoveryReport() (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.1
Nodes (18): classifyFixture(), appendJsonArray(), auditRepoPublicText(), DependencyPinningAnalyzer, ensureRepoDirs(), EnvironmentSpecificityAnalyzer, ExamplePathAnalyzer, InstallProbeRunner (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (19): assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), errorMessage(), exists(), gate() (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (28): FailingRealSourceFixtureAdapter, adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheRoot(), clampInt() (+20 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (27): assertTargetRepo(), buildChecks(), check(), countBy(), counterEvidenceSummary(), FalsificationService, findOverclaims(), hasBenignCase() (+19 more)

### Community 34 - "Community 34"
Cohesion: 0.24
Nodes (8): gate(), hash(), normalizeProgramName(), ProgramOperatorService, renderProgramCard(), renderProgramOperatorReport(), stableId(), withEvidenceHash()

### Community 35 - "Community 35"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (10): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (1): run()

### Community 38 - "Community 38"
Cohesion: 0.5
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

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 39`** (2 nodes): `describeOpenInvention()`, `index.js`
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
- **Thin community `Community 49`** (1 nodes): `instrument.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `writeJson()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 32`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 516 inferred relationships involving `writeJson()` (e.g. with `theoryFixture()` and `writePriorResult()`) actually correct?**
  _`writeJson()` has 516 INFERRED edges - model-reasoned connections that need verification._
- **Are the 381 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 381 INFERRED edges - model-reasoned connections that need verification._
- **Are the 216 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 216 INFERRED edges - model-reasoned connections that need verification._
- **Are the 217 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 217 INFERRED edges - model-reasoned connections that need verification._