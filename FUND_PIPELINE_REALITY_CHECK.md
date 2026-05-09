# Fund Pipeline Reality Check

## Chain

`HardSeed -> CandidateIdea -> CandidateIdentityLedger -> MechanismPlan -> FundCandidateDraft -> candidate-present preflight -> FundCandidate promotion -> Fund Gate -> FUND_FOUND`

This pass did not create a candidate, promote a candidate, change Fund Gate
logic, or create `FUND_FOUND`.

## Step Status

| Step                        | Implemented | Tested | Artifact produced                                                   | Artifact consumed                         | Current blocker                                                       | Missing contract                  | Missing integration test           |
| --------------------------- | ----------- | ------ | ------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| HardSeed                    | yes         | yes    | `.sovryn/discovery-daemon/hard-seeds/*` and cycle refs              | candidate source and draft refs           | none for wiring                                                       | none found                        | added HardSeed to plan test        |
| CandidateIdea               | yes         | yes    | `.sovryn/discovery-daemon/search-cycles/*`                          | identity ledger, draft builder, graveyard | quality/external significance                                         | no external review contract       | existing daemon tests              |
| CandidateIdentityLedger     | yes         | yes    | `.sovryn/discovery-daemon/candidate-identity-ledger.json`           | duplicate prevention, drafts              | none for wiring                                                       | none found                        | existing daemon tests              |
| MechanismPlan               | yes         | yes    | cycle `mechanismPlans`                                              | now consumed by executor                  | fixed P1 nominal-selection gap                                        | execution artifact contract added | added plan/execution tests         |
| FundCandidateDraft          | yes         | yes    | `.sovryn/discovery-daemon/fund-candidate-drafts/*.json`             | candidate-present preflight               | local existing Fund state must not be mutated                         | existing schema strong            | existing and requested draft tests |
| candidate-present preflight | yes         | yes    | `.sovryn/discovery-daemon/candidate-present-preflight.json`         | promotion candidate selection             | local Fund reconciliation                                             | no missing P1 contract found      | existing daemon tests              |
| FundCandidate promotion     | yes         | yes    | `.sovryn/discovery-daemon/fund-candidate.json` and evidence package | Fund Gate                                 | existing candidate path/identity should be reconciled read-only first | state reconciliation contract     | no safe new mutation test added    |
| Fund Gate                   | yes         | yes    | `.sovryn/discovery-daemon/fund-gate-results.json`                   | `FUND_FOUND` transition if passing        | no gate edits allowed                                                 | none changed                      | existing no-fake-Fund tests        |
| `FUND_FOUND`                | yes         | yes    | `.sovryn/discovery-daemon/FUND_FOUND.md`                            | notification/state/audit                  | pre-existing local Fund must not be recreated                         | no changes allowed                | existing no-fake-Fund tests        |

## MechanismPlan Reality

Before this pass:

- `MechanismRouter` built plans.
- Plans named selected tools.
- No cycle-level mechanism execution artifact proved those tools ran.
- Downstream proof/mechanism pressure did not depend on module invocation.

After this pass:

- `MechanismPlanExecutor` invokes selected existing modules.
- It records per-tool `module`, `method`, `invoked`, `artifactRefs`, and
  `evidenceHash`.
- It writes a mechanism execution artifact under
  `.sovryn/discovery-daemon/mechanism-executions`.
- New cycle proof/mechanism pressure consumes the execution artifact.

## Current Blockers

1. Local daemon Fund state and OS closure state conflict.
2. Existing Fund candidate/package identity needs a read-only reconciliation
   audit before any mutation.
3. External review readiness remains caveated; internal gate completion is not
   independent scientific review.
4. Package scout is weak as a candidate intake channel.

## Missing Contracts Left Open

| Contract                                     | Why left open                                                     |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Fund-to-OS closure reconciliation mutation   | Would risk marking capabilities improved or changing Fund state.  |
| Existing candidate path repair               | Would mutate pre-existing Fund artifacts.                         |
| External review acceptance                   | Requires real external review artifacts, not architecture wiring. |
| Package scout promotion from corpus packages | Could alter discovery behavior and candidate creation.            |

## No Fake Fund Confirmation

The applied P1 fix writes only mechanism execution artifacts for future cycles.
It does not write:

- `.sovryn/discovery-daemon/FUND_FOUND.md`
- `.sovryn/discovery-daemon/fund-candidate.json`
- new hard seeds in the product workspace
- new discovery cycle artifacts in the product workspace
