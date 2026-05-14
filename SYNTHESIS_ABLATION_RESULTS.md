# Synthesis Ablation Results

Ablations are implemented as rival triage heuristics on the same receipt-complete holdout tasks.

Full method accuracy: 1.000
Without recurrence/split/negative-control terms (simple-baseline-only): 0.600
Without receipt-aware replay and metric terms (task-size heuristic): 0.800

| Claim             | Full score | Method decision | Simple-baseline-only       | Actual outcome |
| ----------------- | ---------: | --------------- | -------------------------- | -------------- |
| TRB-004-OPENML-6  |      0.224 | triage_reject   | triage_reject              | weak_claim     |
| TRB-005-OPENML-11 |      0.459 | triage_reject   | advance_to_deep_validation | weak_claim     |
| TRB-006-OPENML-12 |      0.454 | triage_reject   | advance_to_deep_validation | weak_claim     |
| TRB-007-OPENML-14 |      0.251 | triage_reject   | triage_reject              | weak_claim     |
| TRB-008-OPENML-15 |      0.471 | triage_reject   | advance_to_deep_validation | weak_claim     |
| TRB-009-OPENML-16 |      0.300 | triage_reject   | triage_reject              | weak_claim     |
| TRB-010-OPENML-18 |      0.401 | triage_reject   | advance_to_deep_validation | weak_claim     |
| TRB-011-OPENML-22 |      0.300 | triage_reject   | triage_reject              | weak_claim     |
| TRB-012-OPENML-23 |      0.282 | triage_reject   | triage_reject              | weak_claim     |
| TRB-013-OPENML-28 |      0.322 | triage_reject   | triage_reject              | weak_claim     |
