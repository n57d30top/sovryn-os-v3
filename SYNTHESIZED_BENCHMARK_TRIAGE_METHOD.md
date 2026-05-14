# Synthesized Benchmark Triage Method

Method ID: RECEIPT_FIRST_BENCHMARK_TRIAGE_V1

## Exact Method Claim

A receipt-first benchmark triage score using baseline margin, holdout delta, split-key adequacy, recurrence potential, negative-control sanity, and source-family penalties predicts weak benchmark/data claims before deep validation better than random, source-family-only, task-size, and simple-baseline-only heuristics on bounded OpenML holdout tasks.

## Input Requirements

- concrete OpenML task ID and dataset ID
- raw-data receipt URL/hash
- target variable
- deterministic split manifest
- quick public replay metrics
- negative-control metric
- group/time/entity keys when the claim depends on them

## Decision Rule

Advance threshold: 0.62

| Component               | Weight | Rationale                                                                                                           |
| ----------------------- | -----: | ------------------------------------------------------------------------------------------------------------------- |
| baseline_margin         |   0.28 | Claims with model-vs-baseline delta <= 0.04 repeatedly died as baseline_dominated.                                  |
| holdout_delta           |   0.24 | A fragility claim needs a nontrivial random-vs-group/time/entity holdout gap.                                       |
| recurrence_potential    |   0.18 | Single-task effects are demoted unless the same mechanism appears across independent tasks.                         |
| split_adequacy          |   0.14 | Group/time/entity claims require documented keys and deterministic split manifests.                                 |
| negative_control_sanity |   0.10 | Shuffled-target or negative controls must behave before deep validation.                                            |
| source_family_penalty   |   0.06 | Repeated same-family patterns are penalized unless supported by a concrete receipt and independent recurrence path. |

## Baselines

- random selection
- source-family-only selection
- task-size heuristic
- simple baseline-only heuristic

## Limitations

- This is a bounded OpenML benchmark-methodology candidate, not a scientific discovery Fund.
- No external validation is claimed.
- The method is trained from a small negative HardSeed set and needs more receipt-complete holdouts before DiscoveryCandidate promotion.
