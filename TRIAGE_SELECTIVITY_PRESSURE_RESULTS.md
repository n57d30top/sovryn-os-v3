# Triage Selectivity Pressure Results

Method accuracy: 0.84
Reject-all accuracy: 0.66
Method beats reject-all: yes
Method beats all baselines: yes
Weak rejection accuracy: 1
Plausible claim retention: 1
Positive-control retention: 0.2
False rejection rate: 0.471
Deep-validation yield: 1
Cost saved: 0.82

| Claim                      | Class            |  Task | Score | Decision                   | Actual    | Cause                   | Replay        |
| -------------------------- | ---------------- | ----: | ----: | -------------------------- | --------- | ----------------------- | ------------- |
| MIX-WEAK-001-OPENML-6      | expected_weak    |     6 | 0.224 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-002-OPENML-11     | expected_weak    |    11 | 0.459 | triage_reject              | weakened  | holdout_not_supported   | replay_passed |
| MIX-WEAK-003-OPENML-12     | expected_weak    |    12 | 0.454 | triage_reject              | killed    | negative_control_failed | replay_passed |
| MIX-WEAK-004-OPENML-14     | expected_weak    |    14 | 0.251 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-005-OPENML-15     | expected_weak    |    15 | 0.471 | triage_reject              | weakened  | holdout_not_supported   | replay_passed |
| MIX-WEAK-006-OPENML-16     | expected_weak    |    16 | 0.300 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-007-OPENML-18     | expected_weak    |    18 | 0.401 | triage_reject              | killed    | negative_control_failed | replay_passed |
| MIX-WEAK-008-OPENML-22     | expected_weak    |    22 | 0.300 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-009-OPENML-23     | expected_weak    |    23 | 0.282 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-010-OPENML-28     | expected_weak    |    28 | 0.502 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-011-OPENML-29     | expected_weak    |    29 | 0.407 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-012-OPENML-31     | expected_weak    |    31 | 0.251 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-013-OPENML-37     | expected_weak    |    37 | 0.335 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-014-OPENML-45     | expected_weak    |    45 | 0.310 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-015-OPENML-3902   | expected_weak    |  3902 | 0.251 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-016-OPENML-6      | expected_weak    |     6 | 0.224 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-017-OPENML-11     | expected_weak    |    11 | 0.459 | triage_reject              | weakened  | holdout_not_supported   | replay_passed |
| MIX-WEAK-018-OPENML-12     | expected_weak    |    12 | 0.454 | triage_reject              | killed    | negative_control_failed | replay_passed |
| MIX-WEAK-019-OPENML-14     | expected_weak    |    14 | 0.251 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-020-OPENML-15     | expected_weak    |    15 | 0.471 | triage_reject              | weakened  | holdout_not_supported   | replay_passed |
| MIX-WEAK-021-OPENML-16     | expected_weak    |    16 | 0.300 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-022-OPENML-18     | expected_weak    |    18 | 0.401 | triage_reject              | killed    | negative_control_failed | replay_passed |
| MIX-WEAK-023-OPENML-22     | expected_weak    |    22 | 0.300 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-024-OPENML-23     | expected_weak    |    23 | 0.282 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-WEAK-025-OPENML-28     | expected_weak    |    28 | 0.502 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-001-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-PLAUS-002-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-PLAUS-003-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-PLAUS-004-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-PLAUS-005-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-PLAUS-006-OPENML-219   | plausible        |   219 | 0.246 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-007-OPENML-3     | plausible        |     3 | 0.224 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-008-OPENML-3917  | plausible        |  3917 | 0.272 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-009-OPENML-10101 | plausible        | 10101 | 0.224 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-010-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-PLAUS-011-OPENML-219   | plausible        |   219 | 0.246 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-012-OPENML-3     | plausible        |     3 | 0.224 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-013-OPENML-3917  | plausible        |  3917 | 0.272 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-014-OPENML-10101 | plausible        | 10101 | 0.224 | triage_reject              | killed    | baseline_dominated      | replay_passed |
| MIX-PLAUS-015-OPENML-32    | plausible        |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-POS-001-OPENML-219     | positive_control |   219 | 0.246 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-002-OPENML-3       | positive_control |     3 | 0.224 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-003-OPENML-32      | positive_control |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-POS-004-OPENML-3917    | positive_control |  3917 | 0.272 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-005-OPENML-10101   | positive_control | 10101 | 0.224 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-006-OPENML-219     | positive_control |   219 | 0.246 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-007-OPENML-3       | positive_control |     3 | 0.224 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-008-OPENML-32      | positive_control |    32 | 0.813 | advance_to_deep_validation | supported | none                    | replay_passed |
| MIX-POS-009-OPENML-3917    | positive_control |  3917 | 0.272 | triage_reject              | supported | none                    | replay_passed |
| MIX-POS-010-OPENML-10101   | positive_control | 10101 | 0.224 | triage_reject              | supported | none                    | replay_passed |
