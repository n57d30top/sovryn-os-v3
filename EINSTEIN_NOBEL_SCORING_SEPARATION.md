# Einstein/Nobel Scoring Separation

## Separation Decision

Reproduction, tool, pipeline, and infrastructure Funds do not count as
Einstein/Nobel discovery score.

They may support these claims:

- the pipeline can package and audit evidence
- runtime reproduction can be inspected
- public corpus publication can pass hygiene gates
- Fund Gate mechanics can work on bounded packages

They may not support these claims:

- a new scientific discovery was found
- a Nobel-ready discovery exists
- Einstein-level discovery capability was demonstrated
- external scientific validation has occurred

## Scorer Enforcement

`NobelReadinessScorer` now separates:

- `discoveryFundCandidateCount`
- `nonDiscoveryFundCandidateCount`
- `externallyReviewReadyCandidateCount`
- `einsteinNobelDiscoveryScoreEligible`
- `scoringSeparationApplied`

The scorer can only count a Fund toward discovery readiness when the FundClass
is `discovery_fund_candidate` or
`externally_review_ready_discovery_candidate`.

## SciPy Result

SciPy is counted as:

- valid bounded Fund: yes
- reproduction Fund: yes
- Einstein/Nobel discovery-counted Fund: no

The result remains useful as a reproduction and pipeline proof.
