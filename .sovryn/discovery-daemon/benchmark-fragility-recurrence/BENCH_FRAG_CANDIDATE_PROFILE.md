# Benchmark Fragility Candidate Profile

Candidate ID: BENCH-FRAG-001-OPENML-3
OpenML task ID: 3
Dataset: 3 / kr-vs-kp
Target variable: class
Metric: accuracy
Model used: one-feature categorical lookup baseline selected by train balanced accuracy
Random split protocol: 70/30 seeded random split; stability replay seeds 17-59
Group/holdout protocol: first-feature value family holdout with rotating group offsets
Group variable/rule: feature-0 value bucket, deterministic source-object group proxy
Prior random-vs-group delta: 0.213
Prior model-vs-majority delta: 0.172

## Evidence refs

- .sovryn/discovery-daemon/benchmark-fragility/BENCHMARK_BASELINE_RESULTS.md#bench-frag-001-openml-3
- .sovryn/discovery-daemon/benchmark-fragility/BENCHMARK_CONTROL_RESULTS.md#bench-frag-001-openml-3
- .sovryn/discovery-daemon/benchmark-fragility/BENCHMARK_REPLAY_RESULTS.md#bench-frag-001-openml-3

## Current missing gates

- cross_task_recurrence
- rival_group_definition_artifact
- external_review_package
- discovery_candidate_identity
