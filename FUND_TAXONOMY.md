# Fund Taxonomy

## Purpose

`FUND_FOUND` means the existing bounded Fund Gate passed. It does not by itself
mean Nobel-level discovery, Einstein-level discovery, or externally validated
science.

This taxonomy separates capability proofs from discovery claims after the Fund
Gate. The gate remains unchanged; the post-gate `FundClass` controls scoring
and interpretation.

## Classes

| FundClass                                     | Meaning                                                                                             | Valid Fund?             | Counts For Einstein/Nobel Discovery Score? |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| `tool_acquisition_success`                    | A tool, dependency, package, or runtime was acquired or installed.                                  | no                      | no                                         |
| `tool_capability_verified`                    | A tool capability was exercised and verified.                                                       | no by itself            | no                                         |
| `pipeline_capability_verified`                | A pipeline, gate, manifest, package, replay, or publication path worked.                            | no by itself            | no                                         |
| `reproduction_fund_candidate`                 | The existing Fund Gate passed for a bounded reproduction package.                                   | yes                     | no                                         |
| `infrastructure_fund_candidate`               | The existing Fund Gate passed for infrastructure capability evidence.                               | yes when package-backed | no                                         |
| `insight_candidate`                           | There is candidate insight evidence, but it has not passed Fund/discovery class requirements.       | no                      | no                                         |
| `discovery_fund_candidate`                    | The Fund passed and binds nontrivial new insight across real targets.                               | yes                     | yes                                        |
| `externally_review_ready_discovery_candidate` | A discovery Fund also binds domain scientific significance and is ready for external domain review. | yes                     | yes                                        |

## Scoring Boundary

Only these classes can increase Einstein/Nobel discovery score:

- `discovery_fund_candidate`
- `externally_review_ready_discovery_candidate`

Everything else can prove operating capability, reproduction capability, package
quality, or infrastructure maturity, but it cannot be counted as a discovery
Fund.
