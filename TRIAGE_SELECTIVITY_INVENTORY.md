# Triage Selectivity Inventory

InsightCandidate: INSIGHT-BENCH-TRIAGE-SELECTIVITY-001

## Exact Method Claim

A receipt-first benchmark triage score using baseline margin, holdout delta, split-key adequacy, recurrence potential, negative-control sanity, and source-family penalties predicts weak benchmark/data claims before deep validation better than random, source-family-only, task-size, and simple-baseline-only heuristics on bounded OpenML holdout tasks.

## Decision Rule

Threshold: 0.62

## Prior Selection

Selected claims: SEL-POS-003-OPENML-32
Rejected claims: 19
False rejections: SEL-POS-001-OPENML-219, SEL-POS-002-OPENML-3, SEL-POS-004-OPENML-3917, SEL-POS-005-OPENML-10101

## Claim Classes

Positive controls: SEL-POS-001-OPENML-219, SEL-POS-002-OPENML-3, SEL-POS-003-OPENML-32, SEL-POS-004-OPENML-3917, SEL-POS-005-OPENML-10101
Plausible claims: SEL-PLAUS-001-OPENML-29, SEL-PLAUS-002-OPENML-31, SEL-PLAUS-003-OPENML-37, SEL-PLAUS-004-OPENML-45, SEL-PLAUS-005-OPENML-3902

## Baselines

- reject-all
- random selection
- task-size heuristic
- baseline-only heuristic
- source-family-only heuristic

## Replay Status

20/20 public replays passed.

## Current Blockers

- high_false_rejection_rate
- positive_control_retention_dominates_current_signal
- no DiscoveryCandidate package yet
