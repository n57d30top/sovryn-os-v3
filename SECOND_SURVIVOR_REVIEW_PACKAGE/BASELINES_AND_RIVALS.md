# Independent Survivor Replay Results

Top claims executed: 8
Replay passed: 6
Replay weakened: 2
Replay failed: 0
Replay blocked: 0

| Rank | Claim                     | Task | Dataset   | Classification  | Rows | Features | Baseline | Random | Holdout | Delta baseline | Delta holdout | Negative | Death cause             |
| ---: | ------------------------- | ---: | --------- | --------------- | ---: | -------: | -------: | -----: | ------: | -------------: | ------------: | -------: | ----------------------- |
|    1 | SECOND-SURV-001-OPENML-59 |   59 | iris      | replay_passed   |  150 |        4 |    0.222 |  0.511 |   0.000 |          0.289 |         0.511 |    0.222 | none                    |
|    2 | SECOND-SURV-002-OPENML-55 |   55 | vote      | replay_weakened |  435 |       16 |    0.634 |  0.634 |   0.166 |          0.000 |         0.468 |    0.626 | baseline_dominated      |
|    3 | SECOND-SURV-003-OPENML-7  |    7 | audiology | replay_passed   |  226 |       69 |    0.250 |  0.500 |   0.000 |          0.250 |         0.500 |    0.059 | none                    |
|    4 | SECOND-SURV-004-OPENML-9  |    9 | autos     | replay_weakened |  205 |       25 |    0.323 |  0.597 |   0.463 |          0.274 |         0.133 |    0.452 | negative_control_failed |
|    5 | SECOND-SURV-005-OPENML-53 |   53 | vehicle   | replay_passed   |  846 |       18 |    0.232 |  0.398 |   0.176 |          0.165 |         0.221 |    0.228 | none                    |
|    6 | SECOND-SURV-006-OPENML-36 |   36 | segment   | replay_passed   | 2310 |       19 |    0.127 |  0.209 |   0.000 |          0.082 |         0.209 |    0.153 | none                    |
|    7 | SECOND-SURV-007-OPENML-43 |   43 | spambase  | replay_passed   | 4601 |       57 |    0.610 |  0.653 |   0.000 |          0.043 |         0.653 |    0.652 | none                    |
|    8 | SECOND-SURV-008-OPENML-15 |   15 | breast-w  | replay_passed   |  699 |        9 |    0.671 |  0.790 |   0.000 |          0.119 |         0.790 |    0.600 | none                    |
