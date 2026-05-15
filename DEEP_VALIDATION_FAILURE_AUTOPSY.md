# Deep Validation Failure Autopsy

Recent deep-validation failures analyzed: 5

| Claim                  | Task | Expected rationale                                                         | Baseline | Holdout | Rival/result | Negative control | Death cause             | Failure class | Reason                                                                           |
| ---------------------- | ---: | -------------------------------------------------------------------------- | -------: | ------: | ------------ | ---------------: | ----------------------- | ------------- | -------------------------------------------------------------------------------- |
| SP-PLAUS-001-OPENML-28 |   28 | selected by survival-potential source quality for deep-validation pressure |    0.090 |   0.085 | killed       |            0.110 | baseline_dominated      | hard          | model-vs-baseline margin did not clear deep-validation baseline survival         |
| SP-PLAUS-003-OPENML-12 |   12 | selected by survival-potential source quality for deep-validation pressure |    0.077 |   0.263 | killed       |            0.245 | negative_control_failed | hard          | negative/shuffled-target control remained too close to the observed model result |
| SP-PLAUS-004-OPENML-18 |   18 | selected by survival-potential source quality for deep-validation pressure |    0.077 |   0.303 | killed       |            0.258 | negative_control_failed | hard          | negative/shuffled-target control remained too close to the observed model result |
| SP-PLAUS-006-OPENML-32 |   32 | selected by survival-potential source quality for deep-validation pressure |    0.094 |   0.000 | weakened     |            0.106 | recurrence_risk         | soft          | single-task or weakly recurring effect lacks independent support                 |
| SP-PLAUS-011-OPENML-15 |   15 | selected by survival-potential source quality for deep-validation pressure |    0.671 |   0.771 | weakened     |            0.600 | holdout_not_supported   | soft          | random-split signal weakened under stronger holdout/split pressure               |
