# Triage Method V3 Spec

Method ID: RECEIPT_FIRST_BENCHMARK_TRIAGE_V3

## Exact Bounded Method Claim

A receipt-first benchmark triage method that uses external plausibility labels, concrete OpenML receipts, replay completeness, task diversity, and baseline/rival risk can retain plausible non-control benchmark claims for deep validation without counting positive controls as discovery evidence.

## Optimization Target

- Retain externally plausible non-control claims for deep validation.
- Reject weak receipt-first claims.
- Do not rely on positive-control features for promotion.
- Preserve task diversity and public replay completeness.
- Treat baseline/rival risk as a downgrade, not as a fake pass.
