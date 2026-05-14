# Selectivity Evaluation Protocol

The test evaluates RECEIPT_FIRST_BENCHMARK_TRIAGE_V1 on a mixed receipt-complete benchmark, not an all-negative holdout.

## Comparators

- reject-all
- random selection
- task-size heuristic
- baseline-only heuristic
- source-family-only heuristic

## Metrics

- weak-claim rejection accuracy
- promising-claim retention
- false rejection rate
- deep-validation yield
- cost saved
- candidate quality improvement

InsightCandidate birth is blocked unless the method beats reject-all, retains at least one supported plausible or positive-control claim, improves deep-validation yield, and preserves public replay.
