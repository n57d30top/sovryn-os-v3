# Final Reconciliation Decision

## Decision

Final status: `reconciliation_complete_with_caveats`

## What Remains Valid

- The SciPy Fund remains valid as a bounded `reproduction_fund_candidate`.
- The current Fund Gate result remains passed.
- `FUND_FOUND.md` remains present and consistent with the current daemon state.
- `fund-candidate.json` remains consistent with the current daemon state.
- The public result package remains valid as a reproduction Fund package.

## What Does Not Count

- The SciPy reproduction Fund does not count for Einstein/Nobel discovery
  scoring.
- It is not a discovery Fund.
- It is not an externally review ready discovery candidate.
- It does not claim Nobel readiness, breakthrough status, AGI, or human-level
  science.

## Candidate Identity Path Status

Status: `wired_with_caveats`

The hard seed, identity ledger, FundCandidate, evidence package, and Fund Gate
are wired. The current FundCandidateDraft hop is not proven for the current
SciPy Fund because the latest candidate-present preflight points to a different
cycle and no SciPy draft artifact was found.

## Fund State Path Status

Status: `wired_with_caveats`

The daemon Fund state and FundClass are consistent. OS closure code/test coverage
correctly excludes reproduction Funds from discovery closure. Caveats remain for
read-only OS closure execution, Nobel-readiness consumption of persisted
FundClass, and public aggregate index propagation of FundClass metadata.

## Deferred Mechanisms

- `fund_state_os_closure_reconciliation`: `wired_with_caveats`
- `fund_candidate_identity_path_reconciliation`: `missing contract`

## Not Anti-Cheat Counted Mechanisms

- `daemon_hard_seeds`: not truly unwired; missing self-assembly anti-cheat proof
  shape.
- `daemon_fund_candidate_draft`: missing current Fund contract.
- `scientific_public_data_triage_domain_pack`: missing explicit mechanism-ID or
  alias contract.
- `corpus_index_graph_export`: wired with caveats; missing selected/export/source
  proof under anti-cheat criteria.

## Tests Added

None.

Reason: the remaining gaps are not test-only gaps. Existing tests already cover
HardSeed validation, draft validation, fake-draft rejection, no promotion without
Fund Gate, FundClass scoring separation, and OS closure exclusion of
reproduction Funds. The unresolved items require forward-looking contracts or
read-only command surfaces before new tests would be meaningful.

## Protected Decisions Remaining

- Do not rewrite the SciPy Fund package to add a draft ref retroactively unless a
  human explicitly decides to annotate it as legacy.
- Do not run OS closure as an automatic status upgrade.
- Do not count reproduction/tool/pipeline Funds toward discovery scoring.
- Do not promote or create candidates during reconciliation.

## Next Recommended Action

Add a read-only Fund reconciliation command and a forward-only package contract
requiring future Fund packages to bind either a FundCandidateDraft ref or an
explicit legacy bypass reason. Then add contract tests for FundClass propagation
into Nobel-readiness and public corpus aggregate indexes.
