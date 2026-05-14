# Frozen Benchmark Fragility Claims

| Claim | Task | Mechanism | Expected Delta | Falsifier |
| --- | ---: | --- | ---: | --- |
| BENCH-FRAG-001-OPENML-3 | 3 | split_leakage | 0.08 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-002-OPENML-6 | 6 | metric_sensitivity | 0.08 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-003-OPENML-11 | 11 | class_imbalance_artifact | 0.10 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-004-OPENML-12 | 12 | contamination_duplicate_leakage | 0.08 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-005-OPENML-14 | 14 | protocol_fragility_under_repeated_splits | 0.06 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-006-OPENML-15 | 15 | target_encoding_leakage | 0.10 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-007-OPENML-16 | 16 | train_test_distribution_shift | 0.08 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-008-OPENML-18 | 18 | group_family_leakage | 0.08 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-009-OPENML-22 | 22 | metric_sensitivity | 0.08 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
| BENCH-FRAG-010-OPENML-23 | 23 | protocol_fragility_under_repeated_splits | 0.06 | The claim is killed if the majority/simple model baseline explains the metric, the shuffled-target control remains high, replay fails, or the stronger split/control removes the delta. |
