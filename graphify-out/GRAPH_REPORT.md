# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 95 files · ~217,528 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1104 nodes · 3162 edges · 24 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 654 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `nowIso()` - 85 edges
2. `writeJson()` - 74 edges
3. `hashEvidence()` - 69 edges
4. `executeCli()` - 63 edges
5. `FactoryService` - 35 edges
6. `runCommand()` - 28 edges
7. `ResearchOpportunityEngine` - 26 edges
8. `InventionService` - 26 edges
9. `evaluateFactoryGates()` - 25 edges
10. `CorpusService` - 24 edges

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
Cohesion: 0.04
Nodes (49): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), configPath(), ensureGitignore(), initConfig(), readText(), createStore() (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (72): initializedRepo(), betaFixture(), createBetaFixture(), configExists(), corpusFixture(), createCorpusFixture(), readJson(), toAppError() (+64 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (53): averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore(), buildFactorySourceReadings() (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (34): appendFactoryCandidateDocs(), assertFactoryEnabled(), boolOrDefault(), clampInt(), copyIfExists(), createFactoryId(), evidenceRefs(), exists() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (41): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), ArxivAbstractReader, asArray(), asRecord(), baseReading(), boolOrDefault() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (32): loadConfig(), factoryPriorArtFixtures(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking() (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (30): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (31): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): asRecord(), assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, nonEmpty() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (30): writeEvent(), arrayOfRecords(), buildFactoryMode(), dedupeFeatures(), extractFeatures(), extractNoveltyGaps(), generateCandidates(), hashObject() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (8): writeCandidatePrototype(), writeJson(), InventionService, writePhaseEvidence(), nowIso(), createToolchainPlanId(), NodeAlphaToolchainManager, withHash()

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (26): qualityCommand(), boolOrDefault(), buildFactoryFindings(), buildRubric(), clampInt(), clampScore(), collectTextFiles(), dimension() (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (26): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+18 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (20): assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), directorySizeMb(), errorMessage(), exists() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (28): adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheKeyFor(), cacheRoot(), clampInt() (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (13): clampInt(), clampScore(), exists(), gate(), listFiles(), readReleaseText(), ReleaseCandidateService, renderPublicationQueue() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (27): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (16): betaGate(), betaRef(), BetaService, clampInt(), copyJsonSummary(), countSourceTests(), docsStatus(), exists() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (24): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 20 - "Community 20"
Cohesion: 0.31
Nodes (10): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.28
Nodes (9): createGitNexusPlugin(), pluginCommand(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin(), loadPlugins(), pluginConfigPath(), resolveModule() (+1 more)

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0):

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 22`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nowIso()` connect `Community 10` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `writeJson()` connect `Community 10` to `Community 0`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 7`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 21`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 84 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 84 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `writeJson()` (e.g. with `initConfig()` and `.check()`) actually correct?**
  _`writeJson()` has 73 INFERRED edges - model-reasoned connections that need verification._
- **Are the 67 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 67 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 40 INFERRED edges - model-reasoned connections that need verification._
