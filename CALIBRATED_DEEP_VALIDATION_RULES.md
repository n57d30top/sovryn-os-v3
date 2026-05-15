# Calibrated Deep Validation Rules

Status: unchanged; gold-set controls support the existing gate definitions.

## Active Rules

- Public replay must pass from concrete task/data receipts.
- Model-vs-baseline delta must exceed the baseline dominance floor.
- Holdout/split delta must be nonfatal for the claim type.
- Negative controls must behave; shuffled/control performance cannot explain the observed signal.
- Recurrence or an explicitly bounded recurrence exception is required before DiscoveryCandidate promotion.
- Known-survivor controls must pass and known-weak controls must fail before treating zero-survivor source runs as meaningful.

## Calibration Notes

- known-survivor controls passed the existing protocol
- known-weak controls were rejected by the existing protocol
- keep baseline, holdout, recurrence, negative-control, and replay gates unchanged
- conclude current survival-potential claim source is low-yield rather than over-strictly filtered
