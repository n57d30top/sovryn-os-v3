# Group / Time / Entity Source Audit

| Claim                                   | Source family                                   | Split/protocol evidence   | Public source                                                   | Gate decision            |
| --------------------------------------- | ----------------------------------------------- | ------------------------- | --------------------------------------------------------------- | ------------------------ |
| MGB-001-TEMPORAL-PROTOCOL-FAMILY        | OpenML temporal classification/regression tasks | time_split                | https://www.openml.org/search?type=task                         | allowed                  |
| MGB-002-ENTITY-DUPLICATE-LEAKAGE-FAMILY | OpenML tabular entity benchmarks                | entity_split              | https://www.openml.org/search?type=data                         | allowed                  |
| MGB-003-METRIC-IMBALANCE-FAMILY         | OpenML imbalanced classification tasks          | published_baseline        | https://www.openml.org/search?type=task                         | allowed                  |
| MGB-004-SCAFFOLD-GROUP-SPLIT            | molecular property benchmark protocols          | documented_group_split    | https://moleculenet.org/                                        | allowed                  |
| MGB-005-UCI-TIME-SERIES-HOLDOUT         | UCI time-series style public benchmarks         | time_split                | https://archive.ics.uci.edu/                                    | allowed                  |
| MGB-006-OPENML-3-UNCHANGED              | OpenML task 3                                   | public_benchmark_protocol | https://www.openml.org/t/3                                      | blocked_before_execution |
| MGB-007-MFEAT-SOURCE-FAMILY             | MFeat benchmark family                          | repeated_tasks            | https://www.openml.org/search?type=data&sort=runs&status=active | blocked_before_execution |
| MGB-008-MATBENCH-RUNTIME-SCALARS        | Matbench materials benchmark                    | public_benchmark_protocol | https://matbench.materialsproject.org/                          | blocked_before_execution |
| MGB-009-REPO-REPRO-MATURITY             | public repo reproduction benchmarks             | published_baseline        | https://github.com/                                             | blocked_before_execution |
| MGB-010-GENERIC-RANDOM-SPLIT            | generic benchmark tasks                         | public_benchmark_protocol | https://www.openml.org/                                         | blocked_before_execution |
| MGB-011-CLASS-PRIOR-ONLY                | OpenML class imbalance tasks                    | published_baseline        | https://www.openml.org/search?type=task                         | blocked_before_execution |
| MGB-012-SOURCE-FAMILY-ONLY-RECURRENCE   | single benchmark suite family                   | repeated_tasks            | https://www.openml.org/                                         | blocked_before_execution |
| MGB-013-NO-REPLAY-BENCHMARK-NOTE        | benchmark note without data file                | public_benchmark_protocol | https://paperswithcode.com/                                     | blocked_before_execution |
| MGB-014-SOFT-CLAIM-HARD-BENCHMARK       | public benchmark challenge note                 | public_benchmark_protocol | https://paperswithcode.com/                                     | blocked_before_execution |
| MGB-015-ENTITY-HOLDOUT-NO-BASELINE      | entity benchmark candidate                      | entity_split              | https://www.openml.org/                                         | blocked_before_execution |
| MGB-016-TIME-SPLIT-NO-NEGATIVE-CONTROL  | time benchmark candidate                        | time_split                | https://archive.ics.uci.edu/                                    | blocked_before_execution |
| MGB-017-REPEATED-TASKS-NO-HOLDOUT       | public repeated tasks                           | repeated_tasks            | https://www.openml.org/                                         | blocked_before_execution |
| MGB-018-PUBLISHED-BASELINE-NO-RIVAL     | published benchmark baseline                    | published_baseline        | https://paperswithcode.com/                                     | blocked_before_execution |
| MGB-019-PROTOCOL-ONLY                   | public benchmark protocol                       | public_benchmark_protocol | https://www.openml.org/                                         | blocked_before_execution |
| MGB-020-ENTITY-SPLIT-PRIVATE-LABELS     | private entity split candidate                  | entity_split              | https://www.openml.org/                                         | blocked_before_execution |
