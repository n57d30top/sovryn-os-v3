# Graph Report - .  (2026-05-03)

## Corpus Check
- 34 files · ~25,982 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 177 nodes · 469 edges · 9 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `executeCli()` - 23 edges
2. `runCommand()` - 22 edges
3. `MissionService` - 18 edges
4. `PostgresStore` - 15 edges
5. `FileStore` - 14 edges
6. `redactSecrets()` - 13 edges
7. `GitAdapter` - 13 edges
8. `nowIso()` - 11 edges
9. `createReview()` - 8 edges
10. `evaluatePolicy()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `appendLesson()` --calls--> `redactSecrets()`  [INFERRED]
  src/core/memory/memory.ts → src/shared/redaction.ts
- `executeGitNexus()` --calls--> `runCommand()`  [INFERRED]
  packages/sovryn-plugin-gitnexus/src/index.ts → src/adapters/shell/command.ts
- `executeGitNexus()` --calls--> `redactSecrets()`  [INFERRED]
  packages/sovryn-plugin-gitnexus/src/index.ts → src/shared/redaction.ts
- `unavailable()` --calls--> `redactSecrets()`  [INFERRED]
  packages/sovryn-plugin-gitnexus/src/index.ts → src/shared/redaction.ts
- `runVerify()` --calls--> `discoverVerifyCommands()`  [INFERRED]
  src/core/verify/verifier.ts → src/core/verify/discovery.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (15): configPath(), ensureGitignore(), initConfig(), loadConfig(), readText(), discoverVerifyCommands(), exists(), readPackageJson() (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (6): createStore(), applyRunnerOptions(), MissionService, nowIso(), runVerify(), WorkspaceManager

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (10): looksLikeNetworkCommand(), networkDenyEnv(), runCommand(), countLines(), GitAdapter, listFiles(), numstat(), shellQuote() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (6): FakeRunner, createRunner(), CodexRunner, shellArg(), ShellRunner, SshRunner

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (10): writeEvent(), appendLesson(), currentValidApprovals(), evaluatePolicy(), listFiles(), riskForFiles(), riskForPath(), riskRank() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (11): createGitNexusPlugin(), executeGitNexus(), pluginCommand(), unavailable(), loadBuiltinPlugins(), loadConfiguredPlugins(), loadPlugin(), loadPlugins() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.28
Nodes (1): PostgresStore

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (11): configExists(), toAppError(), doctor(), ensureInitialized(), executeCli(), flagString(), parseArgs(), rejectForbiddenSecretArgs() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (2): FileStore, redactSecrets()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PostgresStore` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `runCommand()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 8`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `executeCli()` connect `Community 7` to `Community 8`, `Community 1`, `Community 2`, `Community 5`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `executeCli()` (e.g. with `okEnvelope()` and `.init()`) actually correct?**
  _`executeCli()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `runCommand()` (e.g. with `executeGitNexus()` and `runVerify()`) actually correct?**
  _`runCommand()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._