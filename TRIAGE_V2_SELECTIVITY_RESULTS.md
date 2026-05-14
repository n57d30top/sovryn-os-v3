# Triage V2 Selectivity Results

Claims tested: 60
OpenML tasks tested: 20
V1 accuracy: 0.783
V2 accuracy: 1
Reject-all accuracy: 0.8
V2 beats V1: yes
V2 beats reject-all: yes
False rejection rate: 0

| Claim                     | Class            |  Task | V1 score | V1 decision                | V2 score | V2 decision                | Actual    | Cause                   | Independent recurrence | Concentration    |
| ------------------------- | ---------------- | ----: | -------: | -------------------------- | -------: | -------------------------- | --------- | ----------------------- | ---------------------: | ---------------- |
| V2-WEAK-001-OPENML-6      | expected_weak    |     6 |    0.224 | triage_reject              |    0.196 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-002-OPENML-11     | expected_weak    |    11 |    0.459 | triage_reject              |    0.402 | triage_reject              | weakened  | holdout_not_supported   |                      0 | not_selected     |
| V2-WEAK-003-OPENML-12     | expected_weak    |    12 |    0.454 | triage_reject              |    0.374 | triage_reject              | killed    | negative_control_failed |                      0 | not_selected     |
| V2-WEAK-004-OPENML-14     | expected_weak    |    14 |    0.251 | triage_reject              |    0.196 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-005-OPENML-15     | expected_weak    |    15 |    0.471 | triage_reject              |    0.402 | triage_reject              | weakened  | holdout_not_supported   |                      0 | not_selected     |
| V2-WEAK-006-OPENML-16     | expected_weak    |    16 |    0.300 | triage_reject              |    0.238 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-007-OPENML-18     | expected_weak    |    18 |    0.401 | triage_reject              |    0.353 | triage_reject              | killed    | negative_control_failed |                      0 | not_selected     |
| V2-WEAK-008-OPENML-22     | expected_weak    |    22 |    0.300 | triage_reject              |    0.238 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-009-OPENML-23     | expected_weak    |    23 |    0.282 | triage_reject              |    0.229 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-010-OPENML-28     | expected_weak    |    28 |    0.502 | triage_reject              |    0.394 | triage_reject              | killed    | baseline_dominated      |                      1 | not_selected     |
| V2-WEAK-011-OPENML-29     | expected_weak    |    29 |    0.407 | triage_reject              |    0.387 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-012-OPENML-31     | expected_weak    |    31 |    0.251 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-013-OPENML-37     | expected_weak    |    37 |    0.335 | triage_reject              |    0.339 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-014-OPENML-45     | expected_weak    |    45 |    0.310 | triage_reject              |    0.271 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-015-OPENML-3902   | expected_weak    |  3902 |    0.251 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-016-OPENML-6      | expected_weak    |     6 |    0.224 | triage_reject              |    0.196 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-017-OPENML-11     | expected_weak    |    11 |    0.459 | triage_reject              |    0.402 | triage_reject              | weakened  | holdout_not_supported   |                      0 | not_selected     |
| V2-WEAK-018-OPENML-12     | expected_weak    |    12 |    0.454 | triage_reject              |    0.374 | triage_reject              | killed    | negative_control_failed |                      0 | not_selected     |
| V2-WEAK-019-OPENML-14     | expected_weak    |    14 |    0.251 | triage_reject              |    0.196 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-020-OPENML-15     | expected_weak    |    15 |    0.471 | triage_reject              |    0.402 | triage_reject              | weakened  | holdout_not_supported   |                      0 | not_selected     |
| V2-WEAK-021-OPENML-16     | expected_weak    |    16 |    0.300 | triage_reject              |    0.238 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-022-OPENML-18     | expected_weak    |    18 |    0.401 | triage_reject              |    0.353 | triage_reject              | killed    | negative_control_failed |                      0 | not_selected     |
| V2-WEAK-023-OPENML-22     | expected_weak    |    22 |    0.300 | triage_reject              |    0.238 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-WEAK-024-OPENML-23     | expected_weak    |    23 |    0.282 | triage_reject              |    0.229 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-001-OPENML-32    | plausible        |    32 |    0.813 | advance_to_deep_validation |    0.584 | triage_reject              | weakened  | recurrence_risk         |                      1 | not_selected     |
| V2-PLAUS-002-OPENML-219   | plausible        |   219 |    0.322 | triage_reject              |    0.152 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-003-OPENML-3     | plausible        |     3 |    0.300 | triage_reject              |    0.128 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-004-OPENML-3917  | plausible        |  3917 |    0.299 | triage_reject              |    0.138 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-005-OPENML-10101 | plausible        | 10101 |    0.251 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-006-OPENML-29    | plausible        |    29 |    0.407 | triage_reject              |    0.387 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-007-OPENML-31    | plausible        |    31 |    0.251 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-008-OPENML-37    | plausible        |    37 |    0.335 | triage_reject              |    0.339 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-009-OPENML-45    | plausible        |    45 |    0.310 | triage_reject              |    0.271 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-010-OPENML-3902  | plausible        |  3902 |    0.251 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-011-OPENML-6     | plausible        |     6 |    0.224 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-012-OPENML-11    | plausible        |    11 |    0.459 | triage_reject              |    0.424 | triage_reject              | weakened  | holdout_not_supported   |                      0 | not_selected     |
| V2-PLAUS-013-OPENML-12    | plausible        |    12 |    0.454 | triage_reject              |    0.396 | triage_reject              | killed    | negative_control_failed |                      0 | not_selected     |
| V2-PLAUS-014-OPENML-14    | plausible        |    14 |    0.251 | triage_reject              |    0.218 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-015-OPENML-15    | plausible        |    15 |    0.471 | triage_reject              |    0.424 | triage_reject              | weakened  | holdout_not_supported   |                      0 | not_selected     |
| V2-PLAUS-016-OPENML-16    | plausible        |    16 |    0.300 | triage_reject              |    0.260 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-017-OPENML-18    | plausible        |    18 |    0.401 | triage_reject              |    0.375 | triage_reject              | killed    | negative_control_failed |                      0 | not_selected     |
| V2-PLAUS-018-OPENML-22    | plausible        |    22 |    0.300 | triage_reject              |    0.260 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-019-OPENML-23    | plausible        |    23 |    0.282 | triage_reject              |    0.251 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-020-OPENML-28    | plausible        |    28 |    0.502 | triage_reject              |    0.394 | triage_reject              | killed    | baseline_dominated      |                      1 | not_selected     |
| V2-PLAUS-021-OPENML-32    | plausible        |    32 |    0.813 | advance_to_deep_validation |    0.584 | triage_reject              | weakened  | recurrence_risk         |                      1 | not_selected     |
| V2-PLAUS-022-OPENML-219   | plausible        |   219 |    0.322 | triage_reject              |    0.152 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-023-OPENML-3     | plausible        |     3 |    0.300 | triage_reject              |    0.128 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-PLAUS-024-OPENML-3917  | plausible        |  3917 |    0.299 | triage_reject              |    0.138 | triage_reject              | killed    | baseline_dominated      |                      0 | not_selected     |
| V2-POS-001-OPENML-219     | positive_control |   219 |    0.322 | triage_reject              |    0.284 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-002-OPENML-3       | positive_control |     3 |    0.300 | triage_reject              |    0.260 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-003-OPENML-32      | positive_control |    32 |    0.813 | advance_to_deep_validation |    0.716 | advance_to_deep_validation | supported | none                    |                      1 | independent_task |
| V2-POS-004-OPENML-3917    | positive_control |  3917 |    0.299 | triage_reject              |    0.270 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-005-OPENML-10101   | positive_control | 10101 |    0.251 | triage_reject              |    0.218 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-006-OPENML-29      | positive_control |    29 |    0.407 | triage_reject              |    0.387 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-007-OPENML-31      | positive_control |    31 |    0.251 | triage_reject              |    0.218 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-008-OPENML-37      | positive_control |    37 |    0.335 | triage_reject              |    0.339 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-009-OPENML-45      | positive_control |    45 |    0.310 | triage_reject              |    0.271 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-010-OPENML-3902    | positive_control |  3902 |    0.251 | triage_reject              |    0.218 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-011-OPENML-6       | positive_control |     6 |    0.224 | triage_reject              |    0.218 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
| V2-POS-012-OPENML-11      | positive_control |    11 |    0.459 | triage_reject              |    0.424 | advance_to_deep_validation | supported | none                    |                      0 | independent_task |
