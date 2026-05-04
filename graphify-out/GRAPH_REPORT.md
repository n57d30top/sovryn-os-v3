# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 79 files · ~158,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 844 nodes · 2298 edges · 22 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 478 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `nowIso()` - 57 edges
2. `hashEvidence()` - 53 edges
3. `executeCli()` - 49 edges
4. `writeJson()` - 45 edges
5. `FactoryService` - 35 edges
6. `runCommand()` - 28 edges
7. `ResearchOpportunityEngine` - 26 edges
8. `InventionService` - 26 edges
9. `evaluateFactoryGates()` - 25 edges
10. `MissionService` - 18 edges

## Surprising Connections (you probably didn't know these)
- `hashEvidence()` --calls--> `withReadingHash()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/factory/factory-fixtures.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `factoryFixtureRun()` --calls--> `makeTempRepo()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/testkit/temp-repo.ts
- `factoryFixtureRun()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `scan()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-opportunity.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (40): configPath(), ensureGitignore(), initConfig(), loadConfig(), readText(), discoverVerifyCommands(), exists(), readPackageJson() (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (38): appendFactoryCandidateDocs(), assertFactoryEnabled(), boolOrDefault(), clampInt(), copyIfExists(), createFactoryId(), evidenceRefs(), exists() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (31): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), createStore(), writeEvent(), assertSandboxCommandAllowed(), FileStore, countLines() (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (49): configExists(), corpusFixture(), createCorpusFixture(), readJson(), toAppError(), alpha14Fixture(), createStrictRunWithoutSharedState(), readJson() (+41 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (46): averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore(), buildFactorySourceReadings() (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (44): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), fetcher(), jsonResponse(), textResponse(), ArxivAbstractReader, asArray() (+36 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (31): factoryPriorArtFixtures(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking(), clampInt() (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (27): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (28): adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheKeyFor(), cacheRoot(), clampInt() (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (15): buildDuplicateMap(), buildQualityReport(), comparableTokens(), CorpusService, exists(), readinessLabel(), renderCorpusQualityReport(), renderPublicReleases() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (27): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+19 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (13): NodeAlphaToolchainManager, withHash(), doctorResult(), runtimeVersion(), unavailableProfile(), withHash(), workerDoctor(), workerDoctorAll() (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (24): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (11): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.28
Nodes (3): backendForHost(), NodeManager, assertNodeCapability()

### Community 15 - "Community 15"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 16 - "Community 16"
Cohesion: 0.28
Nodes (9): createGitNexusPlugin(), pluginCommand(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin(), loadPlugins(), pluginConfigPath(), resolveModule() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.35
Nodes (9): escapeYaml(), list(), renderCitation(), renderDefensivePublication(), renderNoveltyNotes(), renderPriorArt(), renderReadme(), renderSafetyReview() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (10): currentValidApprovals(), evaluatePolicy(), listFiles(), looksText(), riskForFiles(), riskForPath(), riskRank(), scanChangedFileContents() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (9): arrayOfRecords(), buildFactoryMode(), dedupeFeatures(), extractFeatures(), extractNoveltyGaps(), generateCandidates(), hashObject(), renderFactoryReport() (+1 more)

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0):

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 20`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nowIso()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 14`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`, `Community 8`, `Community 9`, `Community 13`, `Community 16`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 4` to `Community 0`, `Community 1`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 19`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `nowIso()` (e.g. with `researchCacheStatus()` and `writeReports()`) actually correct?**
  _`nowIso()` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `writeJson()` (e.g. with `initConfig()` and `researchCacheStatus()`) actually correct?**
  _`writeJson()` has 44 INFERRED edges - model-reasoned connections that need verification._