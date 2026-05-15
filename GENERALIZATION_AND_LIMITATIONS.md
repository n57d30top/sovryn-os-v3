# Generalization And Limitations

The current package generalizes only across the listed 7 independent OpenML task IDs. It does not generalize across all OpenML tasks, all benchmark suites, all leakage mechanisms, or all ML domains.

## Limitations

- No independent external review has accepted the methodology.
- The first-feature holdout is a deterministic fragility probe, not a verified semantic group/time/entity split for every task.
- External literature supports the risk model and reproducibility expectations, but does not validate this candidate.
- The candidate remains `pipeline_fund_candidate` unless strict notification and discovery-scored gates pass unchanged.
