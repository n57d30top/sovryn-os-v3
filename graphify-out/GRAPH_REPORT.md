# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-07)

## Corpus Check
- 173 files · ~721,476 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3454 nodes · 11288 edges · 46 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 2315 edges (avg confidence: 0.8)
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
1. `writeJson()` - 477 edges
2. `nowIso()` - 356 edges
3. `hashEvidence()` - 218 edges
4. `executeCli()` - 157 edges
5. `ScienceService` - 101 edges
6. `LabService` - 88 edges
7. `withEvidenceHash()` - 76 edges
8. `runCommand()` - 73 edges
9. `readJson()` - 71 edges
10. `labCommand()` - 63 edges

## Surprising Connections (you probably didn't know these)
- `readJsonOrText()` --calls--> `readJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/nobel-discovery-portfolio.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/fs.ts
- `hashEvidence()` --calls--> `candidateImplementation()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/frontier/frontier-service.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `replacePriorArtEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts
- `replaceSourceReadingsEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (230): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+222 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (156): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+148 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (190): scienceCommand(), aggregateMetrics(), analyzeSafety(), assertDatasetCandidateSafe(), assertReproductionPlanRunnable(), assertSafeScope(), average(), buildAblationAnalysis() (+182 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (94): decisionFromReceipt(), ensureReviewDirs(), EvidenceReceiptService, executionNeedForFamily(), ExecutionWavePlanner, ExternalReviewScientistService, ExternalTargetMiner, FieldBoundClaimDecisionService (+86 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (106): averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore(), buildFactorySourceReadings() (+98 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (71): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), comparableTokens(), corpusGate(), CorpusService, exists(), explainSummary() (+63 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (96): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+88 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (44): holdoutRow(), auditFromGates(), baselinesForDomain(), candidatesForDomain(), challengeResult(), challengeTask(), clampInt(), exists() (+36 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (88): average(), booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildScientificMemorySummary(), buildSearchIndex(), buildVersionGroups(), compareShowcaseCandidates() (+80 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (49): loadConfig(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking(), clampInt() (+41 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (54): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+46 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (59): arrayOfRecords(), buildFactoryMode(), dedupeFeatures(), extractFeatures(), extractNoveltyGaps(), generateCandidates(), hashObject(), renderFactoryReport() (+51 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (60): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+52 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (30): buildQualityReport(), temporalCommand(), clampScore(), confidenceForClaim(), rankExperiment(), pct(), directorySizeMb(), appendJsonArray() (+22 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (33): sourcesCommand(), auditFromGates(), baselinesForDomain(), benchmarkTask(), clampInt(), dedupeBy(), exists(), gate() (+25 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (33): knowledgeCommand(), buildContradictions(), buildEvidenceEdges(), buildMethodAtlas(), buildNextExperiments(), claimsForSource(), clampInt(), contradictionCard() (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (26): createStore(), writeEvent(), assertSandboxCommandAllowed(), FileStore, GitAdapter, shellQuote(), hashVerifyEvidence(), hashVerifyOutcome() (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (30): strategyCommand(), baseOpportunity(), buildExecutionCycle(), clampInt(), clampScore(), exists(), gate(), listJsonFiles() (+22 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (39): theoryCommand(), arrayLength(), benchmarkEvidenceTable(), buildCorpusPatternScan(), calibratePredictions(), compareTheories(), conceptCandidates(), containsFakeTheoryClaim() (+31 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (41): artifactsForRoute(), assertSafeGoal(), auditScientificClaimText(), autopublishRecord(), average(), boundedScientistLimitations(), buildMemoryUpdate(), candidate() (+33 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (45): auditFromGates(), buildClaimBindings(), buildExternalTargets(), buildFailureModes(), buildImprovementHypotheses(), buildPreparedDatasets(), buildPreregistration(), buildTools() (+37 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (43): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+35 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (39): auditFromGates(), buildBenchmarkSources(), buildBenchmarkTasks(), buildCandidateMethods(), buildClaimEvidenceBindings(), candidateImplementation(), exists(), frontierPaperFiles() (+31 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (40): auditFromGates(), buildBaselineTools(), buildExternalClaimBindings(), buildHoldoutTasks(), buildMethodIdeas(), buildProblemCandidates(), exists(), ExternalProductionService (+32 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (25): nobelCommand(), auditNobelPublicText(), DiscoveryCandidateScorer, DiscoveryHypothesisGenerator, domain(), domainFromHypothesis(), ensureNobelDirs(), executionFor() (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (48): appendLedger(), applyStagedCorpus(), autopublishRef(), average(), boolOrDefault(), candidateStatus(), clampInt(), copyExistingCorpusForStaging() (+40 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (22): arrayOf(), auditValidationPublicText(), BlindHoldoutSelector, CounterexampleSearchService, countJsonFiles(), DiscoveryValidationService, ensureValidationDirs(), existsJson() (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (17): detectDomain(), DiscoveryService, exists(), gate(), publicDisclaimer(), renderBreakthroughReport(), renderCampaignReport(), renderDiscoveryReport() (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService, renderClaimFeatureMatrix(), renderCounterEvidence() (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (27): assertTargetRepo(), buildChecks(), check(), countBy(), counterEvidenceSummary(), FalsificationService, findOverclaims(), hasBenignCase() (+19 more)

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (3): createToolchainPlanId(), NodeAlphaToolchainManager, withHash()

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (1): run()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (0):

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

- **Why does `writeJson()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 476 inferred relationships involving `writeJson()` (e.g. with `theoryFixture()` and `writePriorResult()`) actually correct?**
  _`writeJson()` has 476 INFERRED edges - model-reasoned connections that need verification._
- **Are the 355 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 355 INFERRED edges - model-reasoned connections that need verification._
- **Are the 216 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 216 INFERRED edges - model-reasoned connections that need verification._
- **Are the 100 inferred relationships involving `executeCli()` (e.g. with `createPublicBetaFixture()` and `createStrictRunWithoutSharedState()`) actually correct?**
  _`executeCli()` has 100 INFERRED edges - model-reasoned connections that need verification._