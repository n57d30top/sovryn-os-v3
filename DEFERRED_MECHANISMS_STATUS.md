# Deferred Mechanisms Status

## Summary

Two protected P1 deferrals remain from self-assembly:

- `fund_state_os_closure_reconciliation`
- `fund_candidate_identity_path_reconciliation`

Neither is a P0 break. Both are protected because autonomous mutation could
rewrite current Fund/candidate state.

## fund_state_os_closure_reconciliation

- Classification: `wired_with_caveats`
- Selected: indirectly, through OS closure and verification/audit commands.
- Invoked: code/tests invoke the closure audit path; this protected pass did not
  use it to mutate current state.
- Artifact produced: closure audit writes `.sovryn/os-v1_6/*` artifacts.
- Downstream consumed: partially. OS closure consumes daemon Fund state and
  FundClass. Nobel-readiness does not yet consume the persisted daemon FundClass
  in its service path.
- Tested: yes for OS closure FundClass separation; missing for live
  Nobel-readiness consumption of daemon FundClass.
- Current blocker: closure audit is not read-only and Nobel-readiness does not
  consume current daemon FundClass assessment.
- Exact missing proof: a protected read-only contract proving
  `fund-gate-results.json -> OS closure -> Nobel-readiness` without changing
  closure state, and proving reproduction Funds remain excluded.

## fund_candidate_identity_path_reconciliation

- Classification: `missing contract`
- Selected: indirectly, through daemon hard-seed, identity ledger, preflight,
  package, and Fund Gate paths.
- Invoked: hard seed, identity ledger, FundCandidate, package generation, and
  Fund Gate are invoked in the current cycle; the FundCandidateDraft hop is not
  proven for the current Fund candidate.
- Artifact produced: hard seed, identity ledger record, FundCandidate,
  evidence package, Fund Gate result.
- Downstream consumed: package bindings consume hard seed and identity ledger
  refs. Fund Gate consumes FundCandidate.
- Tested: validators and package-generation flows are tested. The exact current
  `HardSeed -> ledger -> draft -> FundCandidate` chain is not proven.
- Current blocker: latest `candidate-present-preflight.json` points to
  `cycle-68341`, not the Fund cycle `cycle-68361`; no draft file was found for
  the SciPy Fund candidate.
- Exact missing proof: an immutable preflight/draft reference, or a legacy bypass
  field, in the public evidence package for the current Fund candidate.

## Protected-State Rule

No fix should rewrite `state.json`, `FUND_FOUND.md`, `fund-candidate.json`, the
identity ledger, or package history automatically. The only safe fixes are
forward-looking contracts, read-only audits, or tests against generated
fixtures.
