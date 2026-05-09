# Required Contract Tests

No new tests were added in this protected pass because the remaining gaps are
not test-only gaps. Adding tests without changing contracts would either
duplicate existing coverage or fail against the current protected state.

## Existing Coverage Confirmed

- HardSeed generation and validation are covered in
  `tests/discovery-daemon.test.ts`.
- Hard-seed-only daemon cycles are covered in
  `tests/discovery-daemon.test.ts`.
- FundCandidateDraft validation and fake-draft rejection are covered in
  `tests/discovery-daemon.test.ts`.
- No-promotion-without-Fund-Gate behavior is covered in
  `tests/discovery-daemon.test.ts`.
- FundClass scoring separation is covered in `tests/fund-taxonomy.test.ts`.
- OS closure exclusion of reproduction Funds is covered in
  `tests/os-v16.test.ts`.
- Self-assembly anti-cheat criteria are covered in
  `tests/self-assembly.test.ts`.

## Tests Still Needed

### Current Fund Identity Chain Contract

Test:

`HardSeed -> CandidateIdentityLedger -> FundCandidateDraft|legacy_bypass -> FundCandidate -> Fund Gate`

Expected contract:

- A future promoted Fund candidate must have a candidate-present preflight/draft
  ref, or an explicit immutable legacy bypass reason.
- The contract must not create or promote a candidate.
- The contract must fail if the current latest preflight points to an unrelated
  cycle and no package-level legacy bypass is present.

Reason not added now: the current protected SciPy Fund package has no matching
draft artifact, so this would require a forward-looking contract or legacy
annotation.

### Read-Only Closure Reconciliation Contract

Test:

`fund-gate-results.json -> OS closure read-only summary -> Nobel-readiness scoring separation`

Expected contract:

- A reproduction Fund keeps `fund_candidate_inspectability` eligible but leaves
  positive discovery generation partial.
- The command path must not rewrite `.sovryn/os-v1_6/*`.
- The Nobel-readiness service must report non-discovery Fund candidates without
  counting them as discovery-score eligible.

Reason not added now: the existing `os closure-audit` command writes closure
artifacts, and Nobel-readiness does not yet consume daemon FundClass in the live
service path.

### Public Corpus FundClass Propagation Contract

Test:

`public result package -> public aggregate index/API entry`

Expected contract:

- The result package and aggregate indexes expose the same FundClass and
  `countsForEinsteinNobelDiscoveryScore` flag.
- Public indexes must not imply discovery scoring for reproduction/tool/pipeline
  Funds.

Reason not added now: public aggregate indexes currently list the SciPy package
but omit the classification fields.

### Scientific Public Data Triage Mechanism-ID Contract

Test:

`MechanismRouter dataset/public-data selection -> scientific_public_data_triage_domain_pack proof -> downstream insight-candidate disposition`

Expected contract:

- The router either invokes a distinct public-data triage mechanism or records an
  explicit alias from `scientific_public_data_triage_domain_pack` to
  `dataset_audit_domain_pack`.
- The proof must include selected, invoked, artifact produced, downstream
  consumed, and tested.

Reason not added now: this is a mechanism identity/alias contract, not merely a
missing assertion.

### Corpus Index Graph Export Anti-Cheat Contract

Test:

`corpus index/graph export -> daemon corpus snapshot -> strategy priority`

Expected contract:

- The corpus export is selected or declared as a daemon input source.
- The exported artifact is consumed by daemon context or strategy priority under
  the same proof.

Reason not added now: self-assembly currently proves downstream strategy
consumption but not an upstream selected corpus export mechanism.
