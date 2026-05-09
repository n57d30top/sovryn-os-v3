# Wiring Fixes Applied

## Applied Fixes

### P1-001: `MechanismPlan` execution was connected to real module invocation

Files changed:

- `src/core/discovery-daemon/discovery-daemon-service.ts`
- `tests/discovery-daemon.test.ts`

What changed:

- Added `MechanismPlanExecutor`.
- Added mechanism execution types.
- Added root-scoped execution artifacts at
  `.sovryn/discovery-daemon/mechanism-executions/*.json`.
- Invoked selected tools through existing services:
  - `StrategyService`
  - `KnowledgeService`
  - `CrossDomainEvidenceRoutingService`
  - `NobelReadinessService`
  - `ScienceService`
  - `LabService`
  - `FormalDiscoveryService`
  - `RuntimeReproductionAlignmentService`
  - `TemporalEvaluationFragilityService`
  - `ExternalReviewScientistService`
- Added `mechanismExecutions` to new cycle artifacts.
- Made mechanism routing summary consume execution status.
- Made proof/mechanism pressure consume execution refs and fail closed when a
  new execution is incomplete.
- Kept legacy cycles audit-readable.

## Tests Added

- `HardSeed to MechanismRouter to MechanismPlan preserves hard-seed candidate route`
- `MechanismPlan executor invokes selected domain modules and records consumable artifacts`
- `silent search cycle consumes MechanismPlan execution artifacts downstream`

## Fixes Deliberately Not Applied

| Deferred fix                                | Reason                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Fund/OS closure reconciliation              | Would risk marking capabilities improved or mutating existing Fund state. |
| Existing Fund candidate path repair         | Would mutate pre-existing Fund artifacts.                                 |
| Direct route/package/replay/corpus contract | P2, not required for daemon/Fund P1 gap.                                  |
| Package scout intake strengthening          | Could alter discovery/candidate generation behavior.                      |

## Fund Gate And Discovery Safety

This change did not:

- change Fund Gate logic
- weaken scientific gates
- run a product discovery cycle
- create hard seeds in the product workspace
- create or promote a candidate
- create `FUND_FOUND`
- mark any capability as improved
