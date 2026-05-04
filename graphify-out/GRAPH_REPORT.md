# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 120 files · ~431,189 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1986 nodes · 6192 edges · 27 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 1242 edges (avg confidence: 0.8)
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
1. `writeJson()` - 219 edges
2. `nowIso()` - 159 edges
3. `hashEvidence()` - 137 edges
4. `executeCli()` - 104 edges
5. `runCommand()` - 63 edges
6. `ScienceService` - 45 edges
7. `makeTempRepo()` - 41 edges
8. `FactoryService` - 35 edges
9. `withEvidenceHash()` - 33 edges
10. `readJson()` - 32 edges

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
Nodes (173): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+165 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (73): configExists(), configPath(), ensureGitignore(), initConfig(), loadConfig(), readText(), discoverVerifyCommands(), exists() (+65 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (106): writeJson(), scienceCommand(), aggregateMetrics(), analyzeSafety(), assertSafeScope(), average(), buildAblationAnalysis(), buildAnalysisGates() (+98 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (67): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+59 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (58): appendFactoryCandidateDocs(), assertFactoryEnabled(), assertSandboxCommandAllowed(), boolOrDefault(), clampInt(), copyIfExists(), createFactoryId(), evidenceRefs() (+50 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (40): pilotCommand(), workerCommand(), AutonomyCampaignService, autonomyRef(), benchmarkRef(), buildHumanReviewChecklist(), ensureInitialized(), exists() (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (62): arrayOfRecords(), averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore() (+54 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (60): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+52 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (76): average(), booleanEvidencePassed(), buildPublicCorpusModel(), buildResultGraph(), buildSearchIndex(), buildVersionGroups(), compareShowcaseCandidates(), compareVersionedResults() (+68 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (30): createStore(), writeEvent(), FileStore, countLines(), GitAdapter, listFiles(), numstat(), shellQuote() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (43): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+35 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (49): appendLedger(), applyStagedCorpus(), autopublishRef(), average(), boolOrDefault(), candidateStatus(), clampInt(), copyExistingCorpusForStaging() (+41 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (34): factoryPriorArtFixtures(), factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault() (+26 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (39): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+31 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (32): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+24 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (25): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (50): concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent(), hashesBound() (+42 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (25): createTemporaryCorpusRepo(), createTemporarySovrynRepo(), docsStatus(), exists(), gate(), productRoot(), publicBetaRef(), PublicBetaService (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (20): assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), directorySizeMb(), errorMessage(), exists() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (11): assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), listArtifactFiles(), LocalNodeAlphaBackend, shellQuote(), writeArtifactIndex(), backendForHost() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (29): FailingRealSourceFixtureAdapter, adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheKeyFor(), cacheRoot() (+21 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (27): assertTargetRepo(), buildChecks(), check(), countBy(), counterEvidenceSummary(), FalsificationService, findOverclaims(), hasBenignCase() (+19 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (16): average(), buildTrialGates(), clampInt(), countBy(), gate(), isRecord(), number(), overnightExternalRef() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (1): PostgresStore

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

- **Why does `writeJson()` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 218 inferred relationships involving `writeJson()` (e.g. with `makeTargetRepo()` and `writeResult()`) actually correct?**
  _`writeJson()` has 218 INFERRED edges - model-reasoned connections that need verification._
- **Are the 158 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 158 INFERRED edges - model-reasoned connections that need verification._
- **Are the 135 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 71 inferred relationships involving `executeCli()` (e.g. with `createPublicBetaFixture()` and `createStrictRunWithoutSharedState()`) actually correct?**
  _`executeCli()` has 71 INFERRED edges - model-reasoned connections that need verification._