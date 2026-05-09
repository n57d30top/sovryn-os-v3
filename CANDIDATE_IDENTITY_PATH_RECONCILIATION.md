# Candidate Identity Path Reconciliation

## Scope

Protected read-only trace of the candidate identity path:

`HardSeed -> CandidateIdentityLedger -> FundCandidateDraft -> FundCandidate -> Fund Gate`

No ledger entry was changed, no draft was created, no candidate was promoted, and
no Fund state was rewritten.

## Candidate

- Candidate ID:
  `DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260`
- Cycle: `cycle-68361`
- Domain: `scientific_software_reproduction_mechanisms`
- Current class: `reproduction_fund_candidate`
- Discovery-score eligible: `false`

## Step Trace

### HardSeed

- Status: `fully wired`
- Evidence:
  `.sovryn/discovery-daemon/search-cycles/cycle-68361.json#hardSeeds`
- The winning candidate has a hard seed with ID
  `HARD-DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260`.
- The seed is non-synthetic, non-partial, not LLM-only, not preflight-only, and
  carries public source, evidence, baseline, rival, holdout, replay, and
  counterexample refs.
- The cycle includes hard-seed validation gates and all validations for the
  cycle's hard seeds are accepted.

### CandidateIdentityLedger

- Status: `fully wired`
- Evidence:
  `.sovryn/discovery-daemon/candidate-identity-ledger.json`
- The ledger contains a record for the winning candidate with a stable claim
  hash and version `1`.
- The cycle also records an accepted `identityLedgerDecision` with cause
  `new_identity`.

### FundCandidateDraft

- Status: `missing contract`
- Evidence:
  - `.sovryn/discovery-daemon/candidate-present-preflight.json`
  - `.sovryn/discovery-daemon/fund-candidate-drafts/*.json`
  - `.sovryn/discovery-daemon/fund-candidate-draft-audit.json`
- The draft mechanism is implemented and contract-tested, and existing draft
  artifacts exist.
- Caveat: the current `candidate-present-preflight.json` points at
  `cycle-68341` and a different candidate
  `DAEMON-FRESH-R2820-MATERIALS-PROJECT-PROPERTY-METADATA-EXTERNAL-REVIEW-READY-S282`.
- No draft artifact matching the current SciPy Fund candidate ID was found in
  `fund-candidate-drafts/`.
- Therefore, the exact current chain cannot honestly be stated as
  `HardSeed -> ledger -> FundCandidateDraft -> FundCandidate`. The observed
  current chain is
  `HardSeed -> ledger -> FundCandidate/package bindings -> Fund Gate`.

### FundCandidate

- Status: `fully wired`
- Evidence:
  - `.sovryn/discovery-daemon/fund-candidate.json`
  - `.sovryn/discovery-daemon/evidence-packages/DAEMON-FRESH-R2600-SCIPY-RUNTIME-REPRODUCTION-EXTERNAL-REVIEW-READY-S260/FUND_CANDIDATE.json`
- The candidate binds the exact claim, stable identity fields, public package
  path, replay/holdout/counterexample/kill-week fields, and evidence hash.

### Fund Gate

- Status: `fully wired`
- Evidence:
  `.sovryn/discovery-daemon/fund-gate-results.json`
- The Fund Gate passed for the current candidate and classified it as
  `reproduction_fund_candidate`.
- The candidate does not count for Einstein/Nobel discovery scoring.

## Package Binding

The public-safe evidence package includes `CLAIM_EVIDENCE_BINDINGS.json` with:

- `candidateId` matching the Fund state.
- `hardSeedRefs` pointing to the hard seed in `cycle-68361`.
- `identityLedgerRefs` pointing to the candidate identity ledger record.
- `sourceEvidenceRefs` and cycle refs for predictions, holdouts,
  counterexamples, replay, mechanism pressure, and kill week.

This is a strong binding from hard seed and identity ledger to final package, but
it does not prove a FundCandidateDraft hop for the current Fund candidate.

## Path Classification

Overall path:

`HardSeed -> CandidateIdentityLedger -> FundCandidateDraft -> FundCandidate -> Fund Gate`

Status: `wired_with_caveats`

The hard seed, ledger, FundCandidate, package, and Fund Gate are wired. The
FundCandidateDraft hop is the unresolved caveat because the current preflight
artifact is stale relative to the current Fund cycle and no current SciPy draft
artifact was found.

## Protected Decision

No repair was applied because reconciling the draft hop would touch protected
candidate identity/Fund history. The safe next action is a non-promoting
contract that either:

- requires an archived preflight/draft ref for any future promoted Fund
  candidate, or
- records an explicit legacy bypass reason when an older Fund package predates
  the current draft contract.
