# Discovery Fund Gate Semantics

## What Changed

The existing Fund Gate was not weakened or replaced.

The change is semantic classification after the gate:

`Fund Gate -> FundClass -> scoring interpretation`

## Existing Fund Gate

The existing gate still checks:

- stable candidate identity
- safe high-impact domain
- nontriviality
- rival theory pressure
- baseline resistance
- counterexample pressure
- frozen predictions
- holdout support
- replay reproduction
- proof or mechanism pressure
- kill week
- external review package
- allowed Fund label

## Post-Gate Discovery Semantics

`pipeline_fund_candidate` may remain a valid bounded Fund when the unchanged
Fund Gate passes for a pipeline/package/replay capability package, but it is not
discovery-scored.

`discovery_fund_candidate` additionally requires:

- nontrivial new insight across real targets
- evidence beyond runtime, package, pipeline, or tool success

`externally_review_ready_discovery_candidate` additionally requires:

- all discovery-fund requirements
- domain scientific significance
- package readiness for external domain review

## SciPy Semantics

SciPy passed as a bounded reproduction Fund. It does not become a discovery Fund
because the package claim is reproduction alignment, not a new scientific
insight across real targets.

## Safety

This semantic layer does not create candidates, run discovery cycles, create
`FUND_FOUND`, delete the SciPy Fund, or change the existing Fund Gate pass/fail
rules.

## Forward-Only Package Contract

New contract-v2 Fund packages must bind either a valid `FundCandidateDraft` ref
or an explicit `legacyBypassReason` carrying candidate ID, claim, evidence refs,
and audit status. Legacy packages without this field are accepted only with a
legacy schema caveat.
