# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-05)

## Corpus Check
- 120 files · ~452,853 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2075 nodes · 6511 edges · 27 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 1295 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `writeJson()` - 237 edges
2. `nowIso()` - 169 edges
3. `hashEvidence()` - 141 edges
4. `executeCli()` - 108 edges
5. `ScienceService` - 77 edges
6. `runCommand()` - 64 edges
7. `withEvidenceHash()` - 57 edges
8. `makeTempRepo()` - 42 edges
9. `scienceCommand()` - 41 edges
10. `FactoryService` - 35 edges

## Surprising Connections (you probably didn't know these)
- `hashEvidence()` --calls--> `withReadingHash()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/factory/factory-fixtures.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `replacePriorArtEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts
- `replaceSourceReadingsEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts
- `factoryFixtureRun()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (184): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+176 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (145): writeJson(), scienceCommand(), aggregateMetrics(), analyzeSafety(), assertDatasetCandidateSafe(), assertReproductionPlanRunnable(), assertSafeScope(), average() (+137 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (87): looksLikeNetworkCommand(), networkDenyEnv(), configPath(), ensureGitignore(), initConfig(), readText(), discoverVerifyCommands(), exists() (+79 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (70): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt() (+62 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (59): averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildExperimentPlan(), buildFactoryScore(), buildFactorySourceReadings(), buildFeatureMatrix() (+51 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (42): pilotCommand(), workerCommand(), AutonomyCampaignService, autonomyRef(), benchmarkRef(), buildHumanReviewChecklist(), clampInt(), CorpusDiscoveryService (+34 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (83): average(), booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildScientificMemorySummary(), buildSearchIndex(), buildVersionGroups(), compareShowcaseCandidates() (+75 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (60): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+52 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (44): configExists(), buildCounterEvidence(), assertFactoryEnabled(), boolOrDefault(), clampInt(), copyIfExists(), createFactoryId(), evidenceRefs() (+36 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (56): assertRejected(), autopublishFixture(), candidate(), createAutopublishFixture(), gitStdout(), makeTargetRepo(), policy(), writePilotFixture() (+48 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (43): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+35 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (22): createStore(), writeEvent(), assertSandboxCommandAllowed(), FileStore, countLines(), GitAdapter, listFiles(), numstat() (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (38): commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService, renderClaimFeatureMatrix(), renderCounterEvidence() (+30 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (39): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+31 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (32): loadConfig(), factoryPriorArtFixtures(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking() (+24 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (19): appendFactoryCandidateDocs(), writeCandidatePrototype(), InventionService, phaseEvidenceFileName(), writePhaseEvidence(), priorArtResultsToMatrix(), escapeYaml(), list() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (31): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+23 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (50): concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent(), hashesBound() (+42 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (29): FailingRealSourceFixtureAdapter, adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheKeyFor(), cacheRoot() (+21 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (27): assertTargetRepo(), buildChecks(), check(), countBy(), counterEvidenceSummary(), FalsificationService, findOverclaims(), hasBenignCase() (+19 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (15): clampInt(), clampScore(), exists(), gate(), listFiles(), qualityLabelFor(), readReleaseText(), ReleaseCandidateService (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (16): average(), buildTrialGates(), clampInt(), countBy(), gate(), isRecord(), number(), overnightExternalRef() (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 24 - "Community 24"
Cohesion: 0.31
Nodes (10): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+2 more)

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0):

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 25`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `writeJson()` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 15` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 236 inferred relationships involving `writeJson()` (e.g. with `makeTargetRepo()` and `writeResult()`) actually correct?**
  _`writeJson()` has 236 INFERRED edges - model-reasoned connections that need verification._
- **Are the 168 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 168 INFERRED edges - model-reasoned connections that need verification._
- **Are the 139 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 139 INFERRED edges - model-reasoned connections that need verification._
- **Are the 75 inferred relationships involving `executeCli()` (e.g. with `createPublicBetaFixture()` and `createStrictRunWithoutSharedState()`) actually correct?**
  _`executeCli()` has 75 INFERRED edges - model-reasoned connections that need verification._
