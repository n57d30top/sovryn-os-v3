# Graph Report - .  (2026-05-03)

## Corpus Check
- 34 files · ~28,209 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 181 nodes · 479 edges · 10 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `executeCli()` - 23 edges
2. `runCommand()` - 22 edges
3. `MissionService` - 18 edges
4. `PostgresStore` - 15 edges
5. `FileStore` - 14 edges
6. `redactSecrets()` - 13 edges
7. `GitAdapter` - 13 edges
8. `nowIso()` - 11 edges
9. `evaluatePolicy()` - 9 edges
10. `createReview()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `appendLesson()` --calls--> `redactSecrets()`  [INFERRED]
  src/core/memory/memory.ts → src/shared/redaction.ts
- `executeGitNexus()` --calls--> `runCommand()`  [INFERRED]
  packages/sovryn-plugin-gitnexus/src/index.ts → src/adapters/shell/command.ts
- `executeGitNexus()` --calls--> `redactSecrets()`  [INFERRED]
  packages/sovryn-plugin-gitnexus/src/index.ts → src/shared/redaction.ts
- `unavailable()` --calls--> `redactSecrets()`  [INFERRED]
  packages/sovryn-plugin-gitnexus/src/index.ts → src/shared/redaction.ts
- `configExists()` --calls--> `ensureInitialized()`  [INFERRED]
  src/core/config.ts → src/cli/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (12): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), countLines(), GitAdapter, listFiles(), numstat(), shellQuote() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (11): configExists(), configPath(), ensureGitignore(), initConfig(), loadConfig(), readText(), AppError, readJson() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.28
Nodes (4): createStore(), applyRunnerOptions(), MissionService, nowIso()

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (6): appendLesson(), createRunner(), CodexRunner, shellArg(), ShellRunner, SshRunner

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (12): FakeRunner, createGitNexusPlugin(), executeGitNexus(), pluginCommand(), unavailable(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (3): writeEvent(), FileStore, redactSecrets()

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (10): toAppError(), doctor(), ensureInitialized(), executeCli(), flagString(), parseArgs(), rejectForbiddenSecretArgs(), requiredId() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (10): currentValidApprovals(), evaluatePolicy(), listFiles(), looksText(), riskForFiles(), riskForPath(), riskRank(), scanChangedFileContents() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.26
Nodes (7): discoverVerifyCommands(), exists(), readPackageJson(), hashVerifyEvidence(), hashVerifyOutcome(), hashVerifyResult(), runVerify()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PostgresStore` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `runCommand()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 9`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 7` to `Community 0`, `Community 2`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `executeCli()` (e.g. with `okEnvelope()` and `.init()`) actually correct?**
  _`executeCli()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `runCommand()` (e.g. with `executeGitNexus()` and `runVerify()`) actually correct?**
  _`runCommand()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._