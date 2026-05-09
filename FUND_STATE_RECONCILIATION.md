# Fund State Reconciliation

## Scope

Protected read-only reconciliation of the current Fund-like state. No discovery
cycle was run, no candidate was created or promoted, no Fund Gate logic was
changed, and no OS closure status was changed.

## Current Fund State

- State artifact: `.sovryn/discovery-daemon/state.json`
- State status: `FUND_FOUND`
- `fundFound`: `true`
- Last cycle: `cycle-68361`
- Last candidate:
  `DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260`
- Fund Gate artifact: `.sovryn/discovery-daemon/fund-gate-results.json`
- Fund Gate passed: `true`
- Fund class: `reproduction_fund_candidate`
- Counts for Einstein/Nobel discovery score: `false`

The SciPy Fund remains a valid bounded reproduction Fund. It does not count as a
discovery Fund and does not close Einstein/Nobel discovery scoring.

## Fund State Path

### Fund Gate

- Status: `fully wired`
- Evidence:
  `.sovryn/discovery-daemon/fund-gate-results.json`
- The persisted gate result is for the current daemon candidate, has
  `passed: true`, has `status: FUND_FOUND`, and includes post-gate
  `fundClass: reproduction_fund_candidate`.
- The gate also stores
  `countsForEinsteinNobelDiscoveryScore: false` and a FundClass rationale.

### FUND_FOUND.md

- Status: `fully wired`
- Evidence: `.sovryn/discovery-daemon/FUND_FOUND.md`
- The notification names the same candidate ID and explicitly says the result is
  not a Nobel-level discovery, breakthrough, AGI, or human-level science claim.

### fund-candidate.json

- Status: `fully wired`
- Evidence: `.sovryn/discovery-daemon/fund-candidate.json`
- The candidate ID, exact claim, domain, public package path, stable identity
  fields, replay fields, package fields, and evidence hash are present.

### OS Closure

- Status: `wired_with_caveats`
- Evidence:
  - `src/core/os/os-v16-capability-service.ts`
  - `tests/os-v16.test.ts`
- The OS closure service reads daemon state and `fund-gate-results.json`, and
  tests prove a `reproduction_fund_candidate` does not close discovery scoring.
- Caveat: `os closure-audit` writes closure artifacts under `.sovryn/os-v1_6`.
  Because this reconciliation is protected/read-only, OS closure was not used as
  an automatic state transition.

### Nobel-Readiness

- Status: `missing downstream consumer`
- Evidence:
  - `src/core/nobel/nobel-readiness-service.ts`
  - `tests/fund-taxonomy.test.ts`
- The scorer can receive FundClass assessments and exclude reproduction/tool/
  pipeline Funds from discovery scoring.
- Caveat: the current `NobelReadinessService.score()` path does not read the
  daemon's persisted FundClass assessment from `fund-gate-results.json`. This is
  safe against overcounting because no reproduction Fund is counted, but it means
  the live audit path does not explicitly consume the existing Fund state.

### Corpus / Public Package

- Status: `wired_with_caveats`
- Evidence:
  - `/Users/sovryn/Desktop/sovryn-open-inventions/results/first-fund-scipy-runtime-reproduction-external-review-ready/`
  - `FUND_FOUND.md`
  - `FUND_CANDIDATE.json`
  - `SUMMARY.json`
  - `PUBLIC_FUND_PROMOTION_AUDIT.json`
- The public result package exists and records
  `classification: reproduction_fund_candidate`,
  `countsForEinsteinNobelDiscoveryScore: false`,
  `nontrivialNewInsightAcrossRealTargets: false`, and
  `domainScientificSignificance: false`.
- Caveat: public aggregate indexes such as
  `/Users/sovryn/Desktop/sovryn-open-inventions/INDEX.json` and
  `public-corpus/api/results.json` list the SciPy result but do not currently
  expose the FundClass/scoring fields on the aggregate entry.

## Path Classification

Overall path:

`Fund Gate -> FUND_FOUND.md -> fund-candidate.json -> OS closure -> Nobel-readiness -> corpus/public package`

Status: `wired_with_caveats`

Reason: the core Fund state is consistent and valid as a reproduction Fund, and
OS closure has code/test coverage for excluding reproduction Funds from
discovery closure. The caveats are that OS closure is not read-only when run,
Nobel-readiness does not yet consume the persisted FundClass assessment in its
service path, and public aggregate indexes omit FundClass/scoring metadata even
though the public result package records it.

## Invalid / Stale / Fixture Assessment

- The current `FUND_FOUND.md` is not invalidated by this audit.
- The current `fund-candidate.json` is not invalidated by this audit.
- The current public SciPy package is not invalidated by this audit.
- `candidate-present-preflight.json` is stale relative to the current Fund
  cycle, but that belongs to candidate identity path reconciliation, not to
  invalidation of the already gated Fund state.
