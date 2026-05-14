# Strategy Memory Gate Results

The gate blocked repeated structural failures before execution and allowed only candidates with material changes into the small benchmark/data pass.

| Candidate                          | Death pattern                             | Material change                                                                  | Gate decision                | Execution     | Final classification          |
| ---------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- | ------------- | ----------------------------- |
| MEM-BENCH-OPENML-3-UNCHANGED       | single_task_fragility_signal              | none; repeats the killed OpenML-3 recurrence result                              | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
| MEM-BENCH-OPENML-16-GROUP-ENTITY   | weak_holdout_group_time_entity_support    | adds an entity-style grouped holdout and recurrence comparison before execution  | allowed_with_material_change | top3_executed | weakened_but_not_insight      |
| MEM-BENCH-ELECTRICITY-TIME-CADENCE | rival_theory_stronger                     | adds a time split and cadence rival test                                         | allowed_with_material_change | top3_executed | rival_theory_stronger         |
| MEM-DATA-OPENML-MISSINGNESS-ENTITY | baseline_dominated                        | adds missingness ablation, duplicate controls, and entity holdout                | allowed_with_material_change | top3_executed | baseline_dominated            |
| MEM-BENCH-MFEAT-SOURCE-FAMILY      | known_trivial_or_source_family_documented | none; still source-family documented behavior                                    | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
| MEM-MATBENCH-RAW-REPLAY            | replay_failed                             | none; descriptor matrix, split manifest, and residual formula remain unavailable | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
| MEM-SW-REPRO-MATURITY-DOCS         | rival_theory_stronger                     | none; maturity/docs rival still predicts the outcome better                      | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
| MEM-FORMAL-WITNESS-GENERIC         | no_valid_witness_or_counterexample        | none; no human-curated sharp falsifier or nonstandard oracle supplied            | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
| MEM-FORMAL-STANDARD-CERT           | standard_witness_absorbed                 | none; standard certificate is not a nontrivial discovery claim                   | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
| MEM-HUMAN-FORMAL-INTAKE            | human_curated_input_required              | none; formal path is paused as primary path                                      | blocked_before_execution     | not_executed  | blocked_repeated_kill_pattern |
