# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 103 files · ~287,378 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1455 nodes · 4404 edges · 24 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 910 edges (avg confidence: 0.8)
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
1. `writeJson()` - 132 edges
2. `nowIso()` - 129 edges
3. `hashEvidence()` - 89 edges
4. `executeCli()` - 75 edges
5. `runCommand()` - 38 edges
6. `FactoryService` - 35 edges
7. `withHash()` - 31 edges
8. `E2EService` - 28 edges
9. `readJson()` - 28 edges
10. `ResearchOpportunityEngine` - 26 edges

## Surprising Connections (you probably didn't know these)
- `readAllText()` --calls--> `runCommand()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/external-research.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/adapters/shell/command.ts
- `hashEvidence()` --calls--> `withReadingHash()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/factory/factory-fixtures.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `replacePriorArtEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts
- `replaceSourceReadingsEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (95): initializedRepo(), createOperationsFixture(), createPilotAllFixture(), must(), operationsFixture(), pilotAllFixture(), betaFixture(), createBetaFixture() (+87 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (60): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), configExists(), configPath(), ensureGitignore(), initConfig(), loadConfig() (+52 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (80): arrayOfRecords(), averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore() (+72 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (42): pilotCommand(), workerCommand(), AutonomyCampaignService, autonomyRef(), benchmarkRef(), buildHumanReviewChecklist(), clampInt(), CorpusDiscoveryService (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (58): ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt(), CompositePriorArtSearchAdapter, createPriorArtSearchAdapter(), createPublicSourceSearchAdapter() (+50 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (60): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+52 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (35): appendFactoryCandidateDocs(), writeCandidatePrototype(), assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence() (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (46): appendLedger(), applyStagedCorpus(), autopublishRef(), average(), boolOrDefault(), candidateStatus(), clampInt(), copyExistingCorpusForStaging() (+38 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (31): factoryPriorArtFixtures(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking(), clampInt() (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (39): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), ArxivAbstractReader, asArray(), asRecord(), baseReading(), boolOrDefault() (+31 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (31): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (23): asRecord(), assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, nonEmpty() (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), externalRef(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (28): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (26): qualityCommand(), boolOrDefault(), buildFactoryFindings(), buildRubric(), clampInt(), clampScore(), collectTextFiles(), dimension() (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (23): assertRejected(), autopublishFixture(), candidate(), createAutopublishFixture(), gitStdout(), makeTargetRepo(), policy(), writePilotFixture() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (20): assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), directorySizeMb(), errorMessage(), exists() (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (15): clampInt(), clampScore(), exists(), gate(), listFiles(), qualityLabelFor(), readReleaseText(), ReleaseCandidateService (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (27): analyzePriorArtEvidence(), asRecord(), evaluatePublicationPolicy(), exists(), hashPublicationSource(), invalidPriorArtItemReasons(), isPriorArtKind(), isRelevance() (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (16): betaGate(), betaRef(), BetaService, clampInt(), copyJsonSummary(), countSourceTests(), docsStatus(), exists() (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (24): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.28
Nodes (1): PostgresStore

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

- **Why does `nowIso()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `writeJson()` connect `Community 12` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 10`, `Community 13`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 131 inferred relationships involving `writeJson()` (e.g. with `makeTargetRepo()` and `writePilotFixture()`) actually correct?**
  _`writeJson()` has 131 INFERRED edges - model-reasoned connections that need verification._
- **Are the 128 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 128 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 45 INFERRED edges - model-reasoned connections that need verification._