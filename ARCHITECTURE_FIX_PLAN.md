# Architecture Fix Plan

This plan contains only concrete fixes supported by the cartography and source
inspection. It excludes roadmap-only items and unsafe Fund state changes.

## Fix A: Execute And Consume Daemon `MechanismPlan` Selections

Status: applied.

Source finding:

- `DAEMON_MECHANISM_INTEGRATION.md` showed broad router selection.
- `UNUSED_OR_UNDERUSED_MECHANISMS.md` showed selected mechanisms were still
  underused.
- Source inspection showed `MechanismPlan` selected tools but the cycle did not
  execute those modules or consume a module execution artifact.

Files/modules affected:

- `src/core/discovery-daemon/discovery-daemon-service.ts`
- `tests/discovery-daemon.test.ts`

Expected artifact/contract:

- New artifact:
  `.sovryn/discovery-daemon/mechanism-executions/<cycle-candidate>.json`
- New cycle field: `mechanismExecutions`
- Routing summary fields:
  - `mechanismExecutionCount`
  - `everyMechanismPlanExecuted`
  - `allSelectedToolsInvoked`
  - `downstreamConsumable`
  - `outputArtifactRefs`
- Proof/mechanism pressure fields:
  - `mechanismExecutionRef`
  - `allSelectedToolsInvoked`
  - `downstreamConsumable`
  - `toolInvocationCount`
  - `outputArtifactRefs`

Tests added:

- HardSeed to `MechanismRouter` to `MechanismPlan`
- `MechanismPlan` to domain-specific module invocation
- silent cycle consumes mechanism execution artifacts downstream

Risk:

- More module execution can increase cycle runtime.
- Some invoked services write their own artifacts under the configured root.
- Legacy cycles need compatibility because existing local cycle artifacts do not
  contain `mechanismExecutions`.

Risk mitigation:

- Reused a root-scoped executor.
- Cached shared always-selected mechanism outputs within the executor.
- Allowed legacy cycles without `mechanismExecutions` to remain audit-readable.
- Did not run a product discovery cycle.

Fund Gate impact:

- No Fund Gate logic changed.
- No gates weakened.
- No new candidate or `FUND_FOUND` created.

## Fix B: Fund State To OS Closure Reconciliation

Status: deferred.

Source finding:

- Local `.sovryn/discovery-daemon` already contains pre-existing Fund artifacts.
- OS closure state remains stale relative to that daemon state.

Files/modules that would be affected:

- `.sovryn/discovery-daemon/**`
- `.sovryn/os/**`
- `src/core/os/os-v16-capability-service.ts`

Expected artifact/contract:

- Read-only reconciliation report first.
- Explicit mutation authorization before closure ledger changes.

Test to add if authorized later:

- Existing Fund state is read, compared to OS closure state, and reported
  without marking capabilities improved unless explicitly allowed.

Risk:

- Could violate the user's prohibition on marking capabilities improved.
- Could accidentally legitimize or mutate pre-existing Fund state.

Fund Gate impact:

- Should remain none, but the state risk is high enough to defer.

## Fix C: Direct OS Route Package To Corpus Manifest Verification

Status: deferred P2.

Source finding:

- OS route/package/replay and corpus publish/site audits are both present but
  coupled indirectly.

Files/modules likely affected:

- `src/core/os/os-v15-hardening-service.ts`
- `src/core/os/os-v16-capability-service.ts`
- `src/core/corpus/**`
- tests for OS/corpus integration

Expected artifact/contract:

- Corpus audit reads an OS route package manifest and replay status directly.

Test to add if prioritized later:

- `Route -> Domain Pack -> Public Package -> Manifest -> Replay -> Corpus
audit` in one integration fixture.

Risk:

- Medium: touches cross-subsystem contracts.

Fund Gate impact:

- None.

## Fix D: Package Scout Intake Strengthening

Status: deferred P2/P3.

Source finding:

- Prior cartography records package scout staged count 0.

Files/modules likely affected:

- `src/core/discovery-daemon/discovery-daemon-service.ts`
- corpus package fixtures/tests

Expected artifact/contract:

- Corpus package candidates become inspectable inputs without creating new
  discovery cycles during test execution.

Test to add if prioritized later:

- Public corpus package fixture enters scout as a rejected/accepted inspected
  candidate with explicit reasons.

Risk:

- Could alter discovery behavior and candidate generation.

Fund Gate impact:

- None directly, but candidate intake risk makes it out of scope here.
