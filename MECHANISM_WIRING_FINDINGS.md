# Mechanism Wiring Findings

## P0: Breaks Core Flows

No P0 wiring defect was found that required immediate product changes under the
constraints of this goal.

The core CLI, route/domain-pack, corpus, package/replay, daemon draft/preflight,
and Fund Gate paths are implemented. The main issues are integration depth,
state reconciliation, and evidence strength.

## P1: Blocks Daemon/Fund Pipeline

### P1-001: `MechanismPlan` selected tools were nominal rather than executed

Status: fixed.

Source finding:

- `DAEMON_MECHANISM_INTEGRATION.md` said the daemon selected 14 mechanisms but
  did not fully execute every standalone workflow behind those IDs.
- `UNUSED_OR_UNDERUSED_MECHANISMS.md` called out selected-but-underused
  mechanisms, especially `knowledge_engine`, `domain_packs`, and
  `nobel_readiness_gates`.
- Implementation inspection confirmed that `MechanismRouter` produced
  `MechanismPlan` records while `SilentSearchLoopRunner.runCycle()` built
  pressure evidence without a mechanism execution artifact.

Affected modules:

- `src/core/discovery-daemon/discovery-daemon-service.ts`
- `tests/discovery-daemon.test.ts`

Fix:

- Added `MechanismPlanExecutor`.
- Executed selected tools through existing services.
- Wrote `.sovryn/discovery-daemon/mechanism-executions/*.json`.
- Added `mechanismExecutions` to cycle artifacts.
- Made mechanism routing summary and proof/mechanism pressure consume execution
  artifacts.
- Added completion checks for new cycles while allowing legacy local cycles
  without `mechanismExecutions`.

Fund Gate impact:

- No Fund Gate logic was changed.
- The existing proof/mechanism pressure input is now backed by execution
  evidence when new cycles are produced.

### P1-002: Local Fund state and OS closure state are inconsistent

Status: deferred as unsafe under this goal.

Source finding:

- `FUND_PIPELINE_MAP.md` and `SYSTEM_CARTOGRAPHY_SUMMARY.md` record a
  pre-existing `.sovryn/discovery-daemon/FUND_FOUND.md` and daemon state
  `FUND_FOUND`.
- The same cartography records stale OS v1.6 closure accounting for Fund-related
  capabilities.

Affected modules/artifacts:

- `.sovryn/discovery-daemon/**`
- `.sovryn/os/**`
- `src/core/os/os-v16-capability-service.ts`

Why not fixed:

- Reconciliation could mark capabilities improved or change Fund accounting.
- The user explicitly prohibited changing gates, creating or promoting
  candidates, creating `FUND_FOUND`, and marking capabilities improved.

Required future contract:

- Read-only reconciliation first.
- Explicit permission before any closure ledger mutation.

### P1-003: Existing local Fund candidate path/identity needs reconciliation

Status: deferred as unsafe under this goal.

Source finding:

- `FUND_PIPELINE_MAP.md` records the current candidate ID as
  `DAEMON-FRESH-R2820-MATERIALS-PROJECT-PROPERTY-METADATA-EXTERNAL-REVIEW-READY-S282`
  while one draft/package path is truncated to `...-S28`.

Affected artifacts:

- `.sovryn/discovery-daemon/fund-candidate.json`
- `.sovryn/discovery-daemon/fund-candidate-drafts/*.json`
- `.sovryn/discovery-daemon/evidence-packages/**`

Why not fixed:

- Any mutation would touch existing Fund artifacts.
- This requires a dedicated Fund reconciliation goal, not a wiring fix.

## P2: Weakens OS Routing, Package, Replay, Or Corpus

### P2-001: Route/package/replay/corpus chain is present but indirectly coupled

Status: not changed.

Source finding:

- `OS_ROUTE_PIPELINE_MAP.md` shows target to route to domain pack to evidence
  package and package/replay artifacts.
- Corpus publish/site audits are separate product paths.

Risk:

- A route package can be valid in OS terms while corpus audits validate the
  public corpus/site as a separate surface.

Why not fixed:

- Existing tests cover the OS package/replay path.
- A stronger direct corpus manifest verification contract is useful, but this
  is not a P0/P1 daemon/Fund blocker.

### P2-002: Package scout is weak as a live intake channel

Status: not changed.

Source finding:

- `UNUSED_OR_UNDERUSED_MECHANISMS.md` records local package scout underuse and
  staged count 0.

Risk:

- Public/corpus packages do not strongly feed daemon candidate search.

Why not fixed:

- Improving intake quality could affect discovery behavior and candidate
  generation, which is out of scope for this goal.

## P3: Underused But Non-Blocking Mechanisms

These mechanisms are mature or useful but not daemon-router blockers:

- Mission/worktree/runner/verify/review/policy
- bounded `DiscoveryService`
- general scientist service
- open invention
- factory
- external research
- overnight operator
- external production/reproduction
- frontier/reality/field grading
- publication governance and autopublish
- security/reliability/safety services
- plugin API
- worker/node manager

They should not be wired into the daemon blindly. Each would need a concrete
artifact contract and a candidate promotion purpose.
