# Fund Class Scoring Rules

## Rule 1: Fund Gate Validity And Discovery Scoring Are Separate

The existing Fund Gate still decides whether a bounded candidate may notify as
`FUND_FOUND`.

`FundClass` is applied after the gate and decides what the result means.

## Rule 2: Capability Funds Do Not Count As Discovery Funds

These classes may prove capability but do not increase Einstein/Nobel discovery
score:

- `tool_acquisition_success`
- `tool_capability_verified`
- `pipeline_capability_verified`
- `reproduction_fund_candidate`
- `infrastructure_fund_candidate`
- `insight_candidate`

## Rule 3: Discovery Scoring Requires Discovery Classes

Einstein/Nobel discovery score may count only:

- `discovery_fund_candidate`
- `externally_review_ready_discovery_candidate`

## Rule 4: Discovery Fund Requires New Insight

`discovery_fund_candidate` requires evidence of nontrivial new insight across
real targets. Runtime success, package reproduction, replay success, tool
installation, or package inspectability is not enough.

## Rule 5: External-Review-Ready Discovery Requires Significance

`externally_review_ready_discovery_candidate` requires all discovery-fund
conditions plus domain scientific significance.

## Implementation

Implemented in:

- `src/core/fund/fund-taxonomy.ts`
- `src/core/discovery-daemon/discovery-daemon-service.ts`
- `src/core/nobel/nobel-readiness-service.ts`

Focused tests:

- `tests/fund-taxonomy.test.ts`
