# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 88 files · ~186,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 987 nodes · 2777 edges · 23 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 578 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `nowIso()` - 72 edges
2. `hashEvidence()` - 65 edges
3. `writeJson()` - 58 edges
4. `executeCli()` - 56 edges
5. `FactoryService` - 35 edges
6. `runCommand()` - 28 edges
7. `ResearchOpportunityEngine` - 26 edges
8. `InventionService` - 26 edges
9. `evaluateFactoryGates()` - 25 edges
10. `OvernightOperator` - 21 edges

## Surprising Connections (you probably didn't know these)
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `scan()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-opportunity.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `queueBuild()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-opportunity.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `queueRun()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-opportunity.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `appendLesson()` --calls--> `redactSecrets()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/memory/memory.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/shared/redaction.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (35): configPath(), ensureGitignore(), initConfig(), readText(), discoverVerifyCommands(), exists(), readPackageJson(), AppError (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (61): arrayOfRecords(), averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore() (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (50): configExists(), corpusFixture(), createCorpusFixture(), readJson(), alpha14Fixture(), createStrictRunWithoutSharedState(), readJson(), alpha18Fixture() (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (28): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), createStore(), writeEvent(), assertSandboxCommandAllowed(), FileStore, countLines() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (36): appendFactoryCandidateDocs(), assertFactoryEnabled(), boolOrDefault(), clampInt(), copyIfExists(), createFactoryId(), evidenceRefs(), exists() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (41): fetcher(), jsonResponse(), textResponse(), ArxivAbstractReader, asArray(), asRecord(), baseReading(), boolOrDefault() (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (31): loadConfig(), readJson(), researchCommand(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking() (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (28): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (23): asRecord(), assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, nonEmpty() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (26): qualityCommand(), boolOrDefault(), buildFactoryFindings(), buildRubric(), clampInt(), clampScore(), collectTextFiles(), dimension() (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (21): overnightCommand(), assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), directorySizeMb(), errorMessage() (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (28): adapterDoctor(), adapterRoot(), boolOrDefault(), buildQualityReport(), buildRateLimitReport(), cacheKeyFor(), cacheRoot(), clampInt() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (13): clampInt(), clampScore(), exists(), gate(), listFiles(), readReleaseText(), ReleaseCandidateService, renderPublicationQueue() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (6): exists(), InventionService, slugify(), titleFromBrief(), okEnvelope(), nowIso()

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (15): buildDuplicateMap(), buildQualityReport(), comparableTokens(), CorpusService, exists(), readinessLabel(), renderCorpusQualityReport(), renderPublicReleases() (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (16): flagBool(), workerCommand(), createToolchainPlanId(), NodeAlphaToolchainManager, withHash(), doctorResult(), runtimeVersion(), unavailableProfile() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (27): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (16): Builder, DocWriter, Inventor, PriorArtMapper, Publisher, Scout, Skeptic, escapeYaml() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (24): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (11): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0):

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 21`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nowIso()` connect `Community 13` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 19`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 1` to `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 18`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 71 inferred relationships involving `nowIso()` (e.g. with `researchCacheStatus()` and `writeReports()`) actually correct?**
  _`nowIso()` has 71 INFERRED edges - model-reasoned connections that need verification._
- **Are the 63 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 63 INFERRED edges - model-reasoned connections that need verification._
- **Are the 57 inferred relationships involving `writeJson()` (e.g. with `initConfig()` and `researchCacheStatus()`) actually correct?**
  _`writeJson()` has 57 INFERRED edges - model-reasoned connections that need verification._
- **Are the 37 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 37 INFERRED edges - model-reasoned connections that need verification._