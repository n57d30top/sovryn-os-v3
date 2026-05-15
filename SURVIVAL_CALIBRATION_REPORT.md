# Survival Calibration Report

V3 retained plausible rows used for autopsy: 20
V4 selected plausible claims: 3
Deep-validation survivors: 0

## V3 Death Causes

- recurrence_risk: 1
- baseline_dominated: 15
- holdout_not_supported: 2
- negative_control_failed: 2

## Calibration Interpretation

V4 replaces plausibility-label retention with survival-feature scoring. Positive controls may improve benchmark accuracy, but they are explicitly excluded from DiscoveryCandidate promotion. The promotion blocker remains if plausible non-control claims do not survive baseline, holdout, rival, recurrence, and negative-control pressure.
