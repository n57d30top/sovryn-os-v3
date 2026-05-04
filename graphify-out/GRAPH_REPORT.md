# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 108 files · ~319,352 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1579 nodes · 4845 edges · 26 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 1008 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `writeJson()` - 162 edges
2. `nowIso()` - 134 edges
3. `hashEvidence()` - 111 edges
4. `executeCli()` - 79 edges
5. `runCommand()` - 45 edges
6. `FactoryService` - 35 edges
7. `withHash()` - 31 edges
8. `readJson()` - 31 edges
9. `makeTempRepo()` - 31 edges
10. `E2EService` - 28 edges

## Surprising Connections (you probably didn't know these)
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `readAllText()` --calls--> `runCommand()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/external-research.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/adapters/shell/command.ts
- `hashEvidence()` --calls--> `withReadingHash()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/factory/factory-fixtures.ts
- `createStrictRunWithoutSharedState()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/factory-alpha14.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `createToolchainFixture()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (73): containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), pythonAuditorSource(), pythonAuditorTests(), record(), renderPackageUsage() (+65 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (70): initializedRepo(), createOperationsFixture(), createPilotAllFixture(), must(), operationsFixture(), pilotAllFixture(), betaFixture(), createBetaFixture() (+62 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (63): check(), benchmarkCommand(), betaCommand(), launchCommand(), pilotCommand(), workerCommand(), okEnvelope(), AutonomyCampaignService (+55 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (69): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt() (+61 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (56): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), createStore(), writeEvent(), assertSandboxCommandAllowed(), FileStore, countLines() (+48 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (69): phase(), averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore() (+61 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (60): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+52 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (67): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+59 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (29): commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService, renderClaimFeatureMatrix(), renderCounterEvidence() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (33): loadConfig(), factoryPriorArtFixtures(), readJson(), researchCommand(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity() (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (32): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (27): arrayOfRecords(), buildFactoryMode(), dedupeFeatures(), extractFeatures(), extractNoveltyGaps(), generateCandidates(), hashObject(), renderFactoryReport() (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (33): FakeRunner, autonomyCommand(), e2eCommand(), flagExternalResearchProfile(), flagFactoryRunMode(), flagInt(), flagNodeProfile(), flagRunMode() (+25 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (50): concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent(), hashesBound() (+42 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (25): qualityCommand(), buildFactoryFindings(), buildRubric(), clampScore(), collectTextFiles(), dimension(), dimensionFromLinked(), duplicateRiskForInvention() (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (29): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+21 more)

### Community 16 - "Community 16"
Cohesion: 0.1
Nodes (14): assertSandboxLocalCommandAllowed(), commandOutput(), copyIfExists(), createResearchPlan(), listArtifactFiles(), LocalNodeAlphaBackend, planStep(), shellQuote() (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (16): ChemistryRecordAuditorResearchService, commandSummary(), matrixRow(), renderBenchmarkPlan(), renderClaimFeatureMatrix(), renderCounterEvidence(), renderExperimentPlan(), renderFactoryReport() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (21): betaGate(), betaRef(), BetaService, clampInt(), copyJsonSummary(), countSourceTests(), docsStatus(), exists() (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): clampInt(), exists(), gate(), listFiles(), readReleaseText(), ReleaseCandidateService, renderPublicationQueue(), renderReleaseCandidateReview() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (3): createToolchainPlanId(), NodeAlphaToolchainManager, withHash()

### Community 21 - "Community 21"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 22 - "Community 22"
Cohesion: 0.31
Nodes (10): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (8): assertRejected(), autopublishFixture(), candidate(), createAutopublishFixture(), gitStdout(), makeTargetRepo(), policy(), writePilotFixture()

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0):

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 24`** (2 nodes): `describeOpenInvention()`, `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `prototype.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `nowIso()` connect `Community 2` to `Community 0`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `writeJson()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 23`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 18`, `Community 23`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 161 inferred relationships involving `writeJson()` (e.g. with `makeTargetRepo()` and `writePilotFixture()`) actually correct?**
  _`writeJson()` has 161 INFERRED edges - model-reasoned connections that need verification._
- **Are the 133 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 133 INFERRED edges - model-reasoned connections that need verification._
- **Are the 109 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 109 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 49 INFERRED edges - model-reasoned connections that need verification._
