# Gold Set Deep Validation Results

Gold-set claims: 25
Known survivors passed: 10
Known survivors failed: 0
Known weak rejected: 10

| Claim                      | Class          |  Task | Replay        | Baseline | Random | Holdout | Delta baseline | Delta holdout | Negative | Recurrence | Outcome        | Death cause             | Finding               |
| -------------------------- | -------------- | ----: | ------------- | -------: | -----: | ------: | -------------: | ------------: | -------: | ---------: | -------------- | ----------------------- | --------------------- |
| GOLD-SURV-001-OPENML-219   | known_survivor |   219 | replay_passed |    0.520 |  0.720 |   0.630 |          0.200 |         0.090 |    0.495 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-002-OPENML-3     | known_survivor |     3 | replay_passed |    0.535 |  0.734 |   0.626 |          0.199 |         0.108 |    0.510 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-003-OPENML-32    | known_survivor |    32 | replay_passed |    0.550 |  0.748 |   0.658 |          0.198 |         0.090 |    0.525 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-004-OPENML-3917  | known_survivor |  3917 | replay_passed |    0.520 |  0.762 |   0.654 |          0.242 |         0.108 |    0.495 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-005-OPENML-10101 | known_survivor | 10101 | replay_passed |    0.535 |  0.720 |   0.630 |          0.185 |         0.090 |    0.510 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-006-OPENML-29    | known_survivor |    29 | replay_passed |    0.550 |  0.734 |   0.626 |          0.184 |         0.108 |    0.525 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-007-OPENML-31    | known_survivor |    31 | replay_passed |    0.520 |  0.748 |   0.658 |          0.228 |         0.090 |    0.495 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-008-OPENML-37    | known_survivor |    37 | replay_passed |    0.535 |  0.762 |   0.654 |          0.227 |         0.108 |    0.510 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-009-OPENML-45    | known_survivor |    45 | replay_passed |    0.550 |  0.720 |   0.630 |          0.170 |         0.090 |    0.525 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-SURV-010-OPENML-3902  | known_survivor |  3902 | replay_passed |    0.520 |  0.734 |   0.626 |          0.214 |         0.108 |    0.495 |          2 | candidate_like | none                    | known_survivor_passed |
| GOLD-WEAK-001-OPENML-6     | known_weak     |     6 | replay_passed |    0.580 |  0.690 |   0.675 |          0.110 |         0.015 |    0.540 |          0 | weak_claim     | holdout_not_supported   | known_weak_rejected   |
| GOLD-WEAK-002-OPENML-11    | known_weak     |    11 | replay_passed |    0.580 |  0.690 |   0.610 |          0.110 |         0.080 |    0.690 |          0 | weak_claim     | negative_control_failed | known_weak_rejected   |
| GOLD-WEAK-003-OPENML-12    | known_weak     |    12 | replay_passed |    0.580 |  0.605 |   0.610 |          0.025 |        -0.005 |    0.540 |          0 | weak_claim     | baseline_dominated      | known_weak_rejected   |
| GOLD-WEAK-004-OPENML-14    | known_weak     |    14 | replay_passed |    0.580 |  0.740 |   0.735 |          0.160 |         0.005 |    0.540 |          0 | weak_claim     | holdout_not_supported   | known_weak_rejected   |
| GOLD-WEAK-005-OPENML-15    | known_weak     |    15 | replay_passed |    0.580 |  0.690 |   0.675 |          0.110 |         0.015 |    0.540 |          0 | weak_claim     | holdout_not_supported   | known_weak_rejected   |
| GOLD-WEAK-006-OPENML-16    | known_weak     |    16 | replay_passed |    0.580 |  0.690 |   0.610 |          0.110 |         0.080 |    0.690 |          0 | weak_claim     | negative_control_failed | known_weak_rejected   |
| GOLD-WEAK-007-OPENML-18    | known_weak     |    18 | replay_passed |    0.580 |  0.605 |   0.610 |          0.025 |        -0.005 |    0.540 |          0 | weak_claim     | baseline_dominated      | known_weak_rejected   |
| GOLD-WEAK-008-OPENML-22    | known_weak     |    22 | replay_passed |    0.580 |  0.740 |   0.735 |          0.160 |         0.005 |    0.540 |          0 | weak_claim     | holdout_not_supported   | known_weak_rejected   |
| GOLD-WEAK-009-OPENML-23    | known_weak     |    23 | replay_passed |    0.580 |  0.690 |   0.675 |          0.110 |         0.015 |    0.540 |          0 | weak_claim     | holdout_not_supported   | known_weak_rejected   |
| GOLD-WEAK-010-OPENML-28    | known_weak     |    28 | replay_passed |    0.580 |  0.690 |   0.610 |          0.110 |         0.080 |    0.690 |          0 | weak_claim     | negative_control_failed | known_weak_rejected   |
| GOLD-AMB-001-OPENML-28     | ambiguous      |    28 | replay_passed |    0.550 |  0.710 |   0.655 |          0.160 |         0.055 |    0.530 |          0 | weak_claim     | holdout_not_supported   | ambiguous_weakened    |
| GOLD-AMB-002-OPENML-12     | ambiguous      |    12 | replay_passed |    0.570 |  0.660 |   0.550 |          0.090 |         0.110 |    0.550 |          0 | weak_claim     | recurrence_risk         | ambiguous_weakened    |
| GOLD-AMB-003-OPENML-18     | ambiguous      |    18 | replay_passed |    0.550 |  0.685 |   0.630 |          0.135 |         0.055 |    0.675 |          2 | weak_claim     | negative_control_failed | ambiguous_weakened    |
| GOLD-AMB-004-OPENML-22     | ambiguous      |    22 | replay_passed |    0.570 |  0.710 |   0.600 |          0.140 |         0.110 |    0.550 |          0 | weak_claim     | recurrence_risk         | ambiguous_weakened    |
| GOLD-AMB-005-OPENML-15     | ambiguous      |    15 | replay_passed |    0.550 |  0.660 |   0.605 |          0.110 |         0.055 |    0.530 |          0 | weak_claim     | holdout_not_supported   | ambiguous_weakened    |
