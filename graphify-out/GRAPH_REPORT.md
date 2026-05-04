# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 104 files · ~301,377 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1505 nodes · 4592 edges · 24 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 950 edges (avg confidence: 0.8)
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
1. `writeJson()` - 145 edges
2. `nowIso()` - 131 edges
3. `hashEvidence()` - 100 edges
4. `executeCli()` - 77 edges
5. `runCommand()` - 41 edges
6. `FactoryService` - 35 edges
7. `withHash()` - 31 edges
8. `readJson()` - 29 edges
9. `E2EService` - 28 edges
10. `makeTempRepo()` - 27 edges

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
Nodes (111): initializedRepo(), createOperationsFixture(), createPilotAllFixture(), must(), operationsFixture(), pilotAllFixture(), betaFixture(), createBetaFixture() (+103 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (85): arrayOfRecords(), averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore() (+77 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (57): configPath(), ensureGitignore(), initConfig(), readText(), discoverVerifyCommands(), exists(), readPackageJson(), AppError (+49 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (70): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt() (+62 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (46): check(), benchmarkCommand(), betaCommand(), launchCommand(), pilotCommand(), workerCommand(), AutonomyCampaignService, autonomyRef() (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (61): number(), arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt() (+53 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (39): appendFactoryCandidateDocs(), writeCandidatePrototype(), exists(), InventionService, slugify(), titleFromBrief(), phaseEvidenceFileName(), writePhaseEvidence() (+31 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (31): commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService, renderClaimFeatureMatrix(), renderCounterEvidence() (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (33): loadConfig(), factoryPriorArtFixtures(), readJson(), researchCommand(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity() (+25 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (31): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+23 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (44): appendLedger(), applyStagedCorpus(), autopublishRef(), average(), boolOrDefault(), candidateStatus(), clampInt(), copyExistingCorpusForStaging() (+36 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (32): FakeRunner, autonomyCommand(), e2eCommand(), flagFactoryRunMode(), flagInt(), flagNodeProfile(), flagRunMode(), flagString() (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (50): concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent(), hashesBound() (+42 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (25): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (29): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (26): qualityCommand(), boolOrDefault(), buildFactoryFindings(), buildRubric(), clampInt(), clampScore(), collectTextFiles(), dimension() (+18 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (11): assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), listArtifactFiles(), LocalNodeAlphaBackend, shellQuote(), writeArtifactIndex(), backendForHost() (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (16): betaGate(), betaRef(), BetaService, clampInt(), copyJsonSummary(), countSourceTests(), docsStatus(), exists() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.24
Nodes (11): createGitNexusPlugin(), executeGitNexus(), pluginCommand(), unavailable(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin(), loadPlugins() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 20 - "Community 20"
Cohesion: 0.31
Nodes (10): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.31
Nodes (8): baseConfig(), cachedSearch(), concrete(), factoryFixtureRun(), query(), readJson(), result(), writeJson()

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

- **Why does `writeJson()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 144 inferred relationships involving `writeJson()` (e.g. with `makeTargetRepo()` and `writePilotFixture()`) actually correct?**
  _`writeJson()` has 144 INFERRED edges - model-reasoned connections that need verification._
- **Are the 130 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Are the 98 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 98 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 47 INFERRED edges - model-reasoned connections that need verification._