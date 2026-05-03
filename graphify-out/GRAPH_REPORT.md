# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-03)

## Corpus Check
- 63 files · ~88,213 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 579 nodes · 1491 edges · 17 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 307 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `executeCli()` - 34 edges
2. `nowIso()` - 32 edges
3. `FactoryService` - 27 edges
4. `InventionService` - 26 edges
5. `writeJson()` - 26 edges
6. `runCommand()` - 25 edges
7. `hashEvidence()` - 22 edges
8. `MissionService` - 18 edges
9. `evaluateFactoryGates()` - 16 edges
10. `NodeManager` - 15 edges

## Surprising Connections (you probably didn't know these)
- `appendLesson()` --calls--> `redactSecrets()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/memory/memory.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/redaction.ts
- `fetcher()` --calls--> `fetchJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-source-adapters.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/providers.ts
- `fetcher()` --calls--> `fetchText()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-source-adapters.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/providers.ts
- `loadConfig()` --calls--> `githubDoctor()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/config.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `initConfig()` --calls--> `writeJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/config.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/fs.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (35): configPath(), ensureGitignore(), initConfig(), readText(), discoverVerifyCommands(), exists(), readPackageJson(), AppError (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (25): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), createStore(), createFactoryRun(), FileStore, GitAdapter, numstat() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (28): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (38): fetcher(), jsonResponse(), textResponse(), ArxivAbstractReader, asArray(), asRecord(), baseReading(), boolOrDefault() (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (36): arrayOfRecords(), buildCandidateInventions(), buildFactoryScore(), buildFactorySourceReadings(), buildFeatureMatrix(), buildNoveltyGapMap(), buildQuestionMap(), buildSourceDiscovery() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (19): appendFactoryCandidateDocs(), assertFactoryEnabled(), boolOrDefault(), clampInt(), createFactoryId(), evidenceRefs(), exists(), factoryCycle() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (17): configExists(), doctor(), ensureInitialized(), flagBool(), flagFactoryRunMode(), flagInt(), flagRunMode(), flagString() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (7): loadConfig(), writeCandidatePrototype(), readJson(), writeJson(), InventionService, writePhaseEvidence(), nowIso()

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (19): asRecord(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, nonEmpty(), numberValue() (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (16): Builder, DocWriter, Inventor, PriorArtMapper, Publisher, Scout, Skeptic, escapeYaml() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (24): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (19): check(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent(), hashesBound(), keyName() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (11): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (10): FakeRunner, createGitNexusPlugin(), pluginCommand(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin(), loadPlugins(), pluginConfigPath() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0):

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 15`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nowIso()` connect `Community 7` to `Community 0`, `Community 1`, `Community 5`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 1` to `Community 0`, `Community 5`, `Community 6`, `Community 7`, `Community 12`, `Community 13`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `PostgresStore` connect `Community 14` to `Community 0`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `executeCli()` (e.g. with `createOpenInvention()` and `createFactoryRun()`) actually correct?**
  _`executeCli()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `nowIso()` (e.g. with `writePhaseEvidence()` and `.inventOpen()`) actually correct?**
  _`nowIso()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `writeJson()` (e.g. with `initConfig()` and `writePhaseEvidence()`) actually correct?**
  _`writeJson()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
