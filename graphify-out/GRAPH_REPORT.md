# Graph Report - /Users/sovryn/Desktop/sovryn-os-v3  (2026-05-04)

## Corpus Check
- 112 files · ~336,284 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1658 nodes · 5082 edges · 26 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 1061 edges (avg confidence: 0.8)
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
1. `writeJson()` - 174 edges
2. `nowIso()` - 141 edges
3. `hashEvidence()` - 116 edges
4. `executeCli()` - 82 edges
5. `runCommand()` - 49 edges
6. `FactoryService` - 35 edges
7. `makeTempRepo()` - 33 edges
8. `withHash()` - 31 edges
9. `readJson()` - 31 edges
10. `E2EService` - 28 edges

## Surprising Connections (you probably didn't know these)
- `hashEvidence()` --calls--> `withReadingHash()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/factory/factory-fixtures.ts
- `installToolchain()` --calls--> `executeCli()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/node-toolchain.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/cli/index.ts
- `replacePriorArtEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts
- `replaceSourceReadingsEvidence()` --calls--> `hashEvidence()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/open-invention.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/invention/pipeline.ts
- `cachedSearch()` --calls--> `searchPublicSourcesWithCache()`  [INFERRED]
  /Users/sovryn/Desktop/sovryn-os-v3/tests/research-cache.test.ts → /Users/sovryn/Desktop/sovryn-os-v3/src/core/research/research-cache.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (134): assertRejected(), candidate(), makeResultRoot(), makeTargetCorpusRepo(), policy(), writeCorpusResult(), writeExternalResult(), writeResultFiles() (+126 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (74): configExists(), configPath(), ensureGitignore(), initConfig(), readText(), discoverVerifyCommands(), exists(), readPackageJson() (+66 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (78): phase(), averageEvidenceStrength(), buildBenchmarkPlan(), buildCandidateInventions(), buildClaimElementMap(), buildCounterEvidence(), buildExperimentPlan(), buildFactoryScore() (+70 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (70): factorySourceReadingFixtures(), patentSourceReadingFixture(), withReadingHash(), ArxivSearchAdapter, asArray(), asRecord(), boolOrDefault(), clampInt() (+62 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (42): pilotCommand(), workerCommand(), AutonomyCampaignService, autonomyRef(), benchmarkRef(), buildHumanReviewChecklist(), clampInt(), CorpusDiscoveryService (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (61): arrayOfLaunchLimitations(), buildE2EScorecard(), buildLaunchLimitations(), buildReplayContract(), buildReplayDiagnostics(), check(), clampInt(), collectIds() (+53 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (38): ChemistryRecordAuditorResearchService, commandSummary(), containerNetoffValidationTest(), fixturePint(), happyDataset(), malformedRecord(), matrixRow(), pythonAuditorSource() (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (44): auditRef(), AuditService, countKind(), errorMessage(), fileNameFindings(), gate(), hasKind(), listFiles() (+36 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (21): createStore(), writeEvent(), assertSandboxCommandAllowed(), FileStore, countLines(), GitAdapter, listFiles(), numstat() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (37): exists(), InventionService, slugify(), titleFromBrief(), okEnvelope(), phaseEvidenceFileName(), writePhaseEvidence(), adapterDoctor() (+29 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (48): appendLedger(), applyStagedCorpus(), autopublishRef(), average(), boolOrDefault(), candidateStatus(), clampInt(), copyExistingCorpusForStaging() (+40 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (39): analyzePublicResultQuality(), average(), buildReadabilityReport(), clampScore(), collectTextFiles(), fileText(), finding(), listFiles() (+31 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (32): loadConfig(), factoryPriorArtFixtures(), readJson(), assertOpportunityEngineEnabled(), baseSignals(), boolOrDefault(), buildOpportunity(), buildRanking() (+24 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (31): arrayOfStrings(), buildCorpusGraph(), buildDuplicateMap(), buildQualityReport(), comparableTokens(), corpusGate(), CorpusService, exists() (+23 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (51): check(), concreteSourceTypesRead(), directorySize(), evaluateFactoryGates(), evidenceHashValid(), exists(), findMissionById(), generatedSafetyReviewsPresent() (+43 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (33): average(), buildPublicCorpusModel(), buildResultGraph(), buildSearchIndex(), CorpusProductService, countBy(), escapeHtml(), extractExternalPackages() (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (20): assertOvernightEnabled(), boolOrDefault(), clampInt(), createRunId(), createStableId(), directorySizeMb(), errorMessage(), exists() (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (16): commandSummary(), containerValidationTest(), energyAuditorPython(), energyAuditorTestsPython(), energyDataset(), EnergyRecordAuditorResearchService, renderClaimFeatureMatrix(), renderCounterEvidence() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (15): clampInt(), clampScore(), exists(), gate(), listFiles(), qualityLabelFor(), readReleaseText(), ReleaseCandidateService (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (14): createToolchainPlanId(), NodeAlphaToolchainManager, withHash(), doctorResult(), runtimeVersion(), unavailableProfile(), withHash(), workerDoctor() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (14): average(), buildTrialGates(), clampInt(), countBy(), gate(), number(), overnightExternalRef(), OvernightExternalTrialService (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.19
Nodes (11): assertGitHubTargetSafe(), buildGhRepoCreateCommand(), copyIfExists(), exists(), GitHubPublisher, preparePublicEvidence(), writeFinalVerifySummary(), writePublicSourceSearchSummary() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (3): backendForHost(), NodeManager, assertNodeCapability()

### Community 23 - "Community 23"
Cohesion: 0.28
Nodes (1): PostgresStore

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

- **Why does `writeJson()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 9` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `hashEvidence()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 173 inferred relationships involving `writeJson()` (e.g. with `makeTargetRepo()` and `writePilotFixture()`) actually correct?**
  _`writeJson()` has 173 INFERRED edges - model-reasoned connections that need verification._
- **Are the 140 inferred relationships involving `nowIso()` (e.g. with `.check()` and `.demo()`) actually correct?**
  _`nowIso()` has 140 INFERRED edges - model-reasoned connections that need verification._
- **Are the 114 inferred relationships involving `hashEvidence()` (e.g. with `replacePriorArtEvidence()` and `replaceSourceReadingsEvidence()`) actually correct?**
  _`hashEvidence()` has 114 INFERRED edges - model-reasoned connections that need verification._
- **Are the 52 inferred relationships involving `executeCli()` (e.g. with `createStrictRunWithoutSharedState()` and `createToolchainFixture()`) actually correct?**
  _`executeCli()` has 52 INFERRED edges - model-reasoned connections that need verification._