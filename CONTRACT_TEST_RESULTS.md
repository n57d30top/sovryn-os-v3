# Contract Test Results

## Contract Tests Added

| Contract                                         | Test                                                                                      | Result               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------- |
| HardSeed to `MechanismRouter` to `MechanismPlan` | `HardSeed to MechanismRouter to MechanismPlan preserves hard-seed candidate route`        | passed in `npm test` |
| `MechanismPlan` to selected module invocation    | `MechanismPlan executor invokes selected domain modules and records consumable artifacts` | passed in `npm test` |
| Mechanism execution consumed by cycle pressure   | `silent search cycle consumes MechanismPlan execution artifacts downstream`               | passed in `npm test` |

## Contract Coverage

The new tests cover these requested minimum flows:

- HardSeed -> `MechanismRouter` -> `MechanismPlan`
- `MechanismPlan` -> domain-specific module invocation
- Formal candidate -> formal/proof/refutation route
- Repo candidate -> repo reproduction route
- Temporal candidate -> temporal route
- Dataset/materials/astro candidate -> dataset/public-data route
- Claim/principle candidate -> claim safety + knowledge/rival route
- no fake `FUND_FOUND` during mechanism executor test

Existing daemon tests continue to cover:

- `FundCandidateDraft` validation
- candidate-present preflight behavior
- draft not promoted without required evidence refs
- no fake `FUND_FOUND`
- Fund Gate safety invariants

## Result Log

- `npm test`: passed, 8,594 tests, 0 failures.
- `node --test --test-name-pattern "MechanismPlan|silent search cycle consumes" dist/tests/discovery-daemon.test.js`:
  passed during implementation, 3 selected tests, 0 failures.
- Full daemon suite passed during implementation before executor caching, 591
  tests, 0 failures.
