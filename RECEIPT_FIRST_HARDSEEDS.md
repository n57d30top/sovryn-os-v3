# Receipt First HardSeeds

Reusable negative HardSeeds extracted: 4

| HardSeed                           | Source claim       | Type                           | Baseline | Random | Holdout |  Delta | Lesson                                                                                                                                                      |
| ---------------------------------- | ------------------ | ------------------------------ | -------: | -----: | ------: | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-HARDSEED-001-219                | TRB-001-OPENML-219 | baseline_dominated_case        |    0.583 |  0.574 |   0.570 |  0.004 | Baseline dominance was visible from replay metrics: model-vs-majority delta -0.009 did not clear the birth threshold.                                       |
| RF-HARDSEED-002-3                  | TRB-002-OPENML-3   | baseline_dominated_case        |    0.526 |  0.474 |   0.524 | -0.049 | Baseline dominance was visible from replay metrics: model-vs-majority delta -0.051 did not clear the birth threshold.                                       |
| RF-HARDSEED-003-32                 | TRB-003-OPENML-32  | recurrence_not_supported_case  |    0.100 |  0.236 |   0.000 |  0.236 | A single strong holdout delta (0.236) is insufficient without independent task recurrence.                                                                  |
| RF-HARDSEED-004-REPLAY-SUFFICIENCY | cross-cutting      | public_replay_negative_control |    0.403 |  0.428 |   0.365 |  0.064 | Public replay can succeed while the claim still dies; Synthesizer selection must predict death causes before deep validation, not merely validate receipts. |
