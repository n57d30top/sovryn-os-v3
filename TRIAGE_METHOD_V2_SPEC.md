# Triage Method V2 Spec

Method ID: RECEIPT_FIRST_BENCHMARK_TRIAGE_V2

## Exact Bounded Method Claim

A receipt-first benchmark triage score with unique-task recurrence, same-task concentration suppression, calibrated plausible thresholds, and false-rejection control can distinguish weak benchmark claims from plausible receipt-complete claims better than V1 and reject-all on an independent OpenML benchmark.

## V2 Additions

- Task-diversity penalty for repeated same-task variants.
- Source/dataset concentration check via selected-task concentration.
- Independent-task retention target: at least two plausible non-control survivors from at least two OpenML tasks.
- Plausible threshold remains 0.62, while expected-weak claims require 0.72 to advance.
- Positive controls are retained only as sanity checks and cannot alone support promotion.
- Recurrence is counted by unique OpenML tasks, not claim rows.

## Promotion Guard

No DiscoveryCandidate may be created unless V2 beats V1 and reject-all, replay succeeds, false rejection is acceptable, and plausible non-control survival is independent across tasks.
