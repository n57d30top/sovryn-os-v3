# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 66 files · ~119,573 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 652 nodes · 1739 edges · 17 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 359 edges (avg confidence: 0.8)
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
1. `nowIso()` - 38 edges
2. `executeCli()` - 36 edges
3. `FactoryService` - 35 edges
4. `writeJson()` - 33 edges
5. `hashEvidence()` - 32 edges
6. `runCommand()` - 27 edges
7. `InventionService` - 26 edges
8. `evaluateFactoryGates()` - 25 edges
9. `MissionService` - 18 edges
10. `redactSecrets()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `hashEvidence()` --calls--> `withReadingHash()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/factory/factory-fixtures.ts
- `appendLesson()` --calls--> `redactSecrets()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/memory/memory.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/redaction.ts
- `createStrictRunWithoutSharedState()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/factory-alpha14.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `createOpenInvention()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `replacePriorArtEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (44): writeEvent(), arrayOfRecords(), buildFactoryMode(), dedupeFeatures(), extractFeatures(), extractNoveltyGaps(), generateCandidates(), hashObject() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (36): appendFactoryCandidateDocs(), assertFactoryEnabled(), boolOrDefault(), clampInt(), copyIfExists(), createFactoryId(), evidenceRefs(), exists() (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (20): runCommand(), createStore(), assertSandboxCommandAllowed(), FileStore, GitAdapter, numstat(), shellQuote(), hashVerifyEvidence() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (34): looksLikeNetworkCommand(), networkDenyEnv(), configExists(), configPath(), ensureGitignore(), initConfig(), loadConfig(), readText() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (41): fetcher(), jsonResponse(), textResponse(), ArxivAbstractReader, asArray(), asRecord(), baseReading(), boolOrDefault() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (27): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (24): alpha14Fixture(), createStrictRunWithoutSharedState(), readJson(), factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), createFactoryRun(), findGeneratedInvention() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (27): FakeRunner, createGitNexusPlugin(), doctor(), executeGitNexus(), flagBool(), flagFactoryRunMode(), flagInt(), flagNodeProfile() (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (29): averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore(), buildFactorySourceReadings(), buildFeatureMatrix() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (4): factoryPriorArtFixtures(), readJson(), InventionService, WebSearchLinkAdapter

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (27): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+19 more)

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (24): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (11): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 14 - "Community 14"
Cohesion: 0.35
Nodes (9): escapeYaml(), list(), renderCitation(), renderDefensivePublication(), renderNoveltyNotes(), renderPriorArt(), renderReadme(), renderSafetyReview() (+1 more)

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

- **Why does `nowIso()` connect `Community 1` to `Community 0`, `Community 9`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 2` to `Community 1`, `Community 3`, `Community 6`, `Community 7`, `Community 9`, `Community 12`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `PostgresStore` connect `Community 13` to `Community 3`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `nowIso()` (e.g. with `writePhaseEvidence()` and `.inventOpen()`) actually correct?**
  _`nowIso()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createOpenInvention()`) actually correct?**
  _`executeCli()` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `writeJson()` (e.g. with `initConfig()` and `writePhaseEvidence()`) actually correct?**
  _`writeJson()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 30 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 30 INFERRED edges - model-reasoned connections that need verification._
