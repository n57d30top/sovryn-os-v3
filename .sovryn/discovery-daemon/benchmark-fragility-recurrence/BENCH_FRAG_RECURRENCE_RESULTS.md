# Benchmark Fragility Recurrence Results

Supported recurrent tasks: 1.

| Claim | Task | Delta | Model-Majority | Majority | Shuffled | Duplicate Ratio | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| BENCH-FRAG-REC-OPENML-6 | 6 | -0.014 | 0.105 | 0.042 | 0.039 | 0.029 | not_recurrent |
| BENCH-FRAG-REC-OPENML-11 | 11 | -0.028 | -0.021 | 0.463 | 0.429 | 0.000 | baseline_dominated |
| BENCH-FRAG-REC-OPENML-12 | 12 | 0.022 | 0.213 | 0.082 | 0.130 | 0.003 | not_recurrent |
| BENCH-FRAG-REC-OPENML-14 | 14 | 0.019 | 0.300 | 0.082 | 0.068 | 0.003 | not_recurrent |
| BENCH-FRAG-REC-OPENML-15 | 15 | -0.014 | 0.204 | 0.705 | 0.582 | 0.424 | not_recurrent |
| BENCH-FRAG-REC-OPENML-16 | 16 | 0.142 | 0.160 | 0.082 | 0.073 | 0.003 | mechanism_supported |
| BENCH-FRAG-REC-OPENML-18 | 18 | 0.112 | 0.031 | 0.082 | 0.106 | 0.063 | baseline_dominated |
| BENCH-FRAG-REC-OPENML-22 | 22 | -0.015 | 0.031 | 0.082 | 0.111 | 0.003 | baseline_dominated |
| BENCH-FRAG-REC-OPENML-23 | 23 | -0.017 | 0.049 | 0.400 | 0.325 | 0.100 | not_recurrent |
| BENCH-FRAG-REC-OPENML-28 | 28 | -0.003 | 0.167 | 0.094 | 0.138 | 0.000 | not_recurrent |

Recurrence threshold did not pass; the candidate remains a single-task or weakly recurrent fragility signal.
