# Selectivity Triage Results

Method accuracy: 0.800
Reject-all accuracy: 0.750
Method beats reject-all: yes
Promising retention: 0.200
False rejection rate: 0.800
Cost saved: 0.950

| Claim                     | Class            | Score | Decision                   | Actual outcome | Death cause             | Replay        |
| ------------------------- | ---------------- | ----: | -------------------------- | -------------- | ----------------------- | ------------- |
| SEL-WEAK-001-OPENML-6     | expected_weak    | 0.224 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-WEAK-002-OPENML-11    | expected_weak    | 0.459 | triage_reject              | weakened       | holdout_not_supported   | replay_passed |
| SEL-WEAK-003-OPENML-12    | expected_weak    | 0.454 | triage_reject              | killed         | negative_control_failed | replay_passed |
| SEL-WEAK-004-OPENML-14    | expected_weak    | 0.251 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-WEAK-005-OPENML-15    | expected_weak    | 0.471 | triage_reject              | weakened       | holdout_not_supported   | replay_passed |
| SEL-WEAK-006-OPENML-16    | expected_weak    | 0.300 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-WEAK-007-OPENML-18    | expected_weak    | 0.401 | triage_reject              | killed         | negative_control_failed | replay_passed |
| SEL-WEAK-008-OPENML-22    | expected_weak    | 0.300 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-WEAK-009-OPENML-23    | expected_weak    | 0.282 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-WEAK-010-OPENML-28    | expected_weak    | 0.412 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-PLAUS-001-OPENML-29   | plausible        | 0.407 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-PLAUS-002-OPENML-31   | plausible        | 0.251 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-PLAUS-003-OPENML-37   | plausible        | 0.335 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-PLAUS-004-OPENML-45   | plausible        | 0.310 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-PLAUS-005-OPENML-3902 | plausible        | 0.251 | triage_reject              | killed         | baseline_dominated      | replay_passed |
| SEL-POS-001-OPENML-219    | positive_control | 0.246 | triage_reject              | supported      | none                    | replay_passed |
| SEL-POS-002-OPENML-3      | positive_control | 0.224 | triage_reject              | supported      | none                    | replay_passed |
| SEL-POS-003-OPENML-32     | positive_control | 0.723 | advance_to_deep_validation | supported      | none                    | replay_passed |
| SEL-POS-004-OPENML-3917   | positive_control | 0.272 | triage_reject              | supported      | none                    | replay_passed |
| SEL-POS-005-OPENML-10101  | positive_control | 0.224 | triage_reject              | supported      | none                    | replay_passed |
