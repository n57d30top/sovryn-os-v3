# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 64 files · ~106,071 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 610 nodes · 1589 edges · 16 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 327 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `nowIso()` - 34 edges
2. `executeCli()` - 34 edges
3. `FactoryService` - 32 edges
4. `writeJson()` - 29 edges
5. `InventionService` - 26 edges
6. `runCommand()` - 26 edges
7. `hashEvidence()` - 24 edges
8. `evaluateFactoryGates()` - 20 edges
9. `MissionService` - 18 edges
10. `redactSecrets()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `appendLesson()` --calls--> `redactSecrets()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/memory/memory.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/redaction.ts
- `createOpenInvention()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `fetcher()` --calls--> `fetchJson()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-source-adapters.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/source-readers.ts
- `fetcher()` --calls--> `fetchText()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/public-source-adapters.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/source-readers.ts
- `createFactoryRun()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/factory.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (35): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), createStore(), FileStore, countLines(), GitAdapter, listFiles() (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (31): factoryPriorArtFixtures(), factorySourceReadingFixtures(), appendFactoryCandidateDocs(), assertFactoryEnabled(), assertSandboxCommandAllowed(), boolOrDefault(), clampInt(), copyIfExists() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (44): arrayOfRecords(), buildCandidateInventions(), buildFactoryScore(), buildFactorySourceReadings(), buildFeatureMatrix(), buildNoveltyGapMap(), buildQuestionMap(), buildSourceCards() (+36 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (33): configExists(), configPath(), ensureGitignore(), initConfig(), loadConfig(), readText(), discoverVerifyCommands(), exists() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (30): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (23): asRecord(), assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, nonEmpty() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (35): ArxivAbstractReader, asArray(), asRecord(), baseReading(), boolOrDefault(), clampInt(), CompositeSourceReadingProvider, createSourceReadingEvidence() (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (10): writeEvent(), writeCandidatePrototype(), readJson(), writeJson(), exists(), InventionService, slugify(), titleFromBrief() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (16): Builder, DocWriter, Inventor, PriorArtMapper, Publisher, Scout, Skeptic, escapeYaml() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (23): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (24): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (11): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (11): createGitNexusPlugin(), executeGitNexus(), pluginCommand(), unavailable(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin(), loadPlugins() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0):

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 14`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nowIso()` connect `Community 7` to `Community 0`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 7`, `Community 11`, `Community 12`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `PostgresStore` connect `Community 13` to `Community 3`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `nowIso()` (e.g. with `writePhaseEvidence()` and `.inventOpen()`) actually correct?**
  _`nowIso()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `executeCli()` (e.g. with `createOpenInvention()` and `createFactoryRun()`) actually correct?**
  _`executeCli()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `writeJson()` (e.g. with `initConfig()` and `writePhaseEvidence()`) actually correct?**
  _`writeJson()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
