# Survivor Public Raw Replay Results

Replay passed: 1
Replay weakened: 4
Replay failed: 0
Replay blocked: 0

| Claim                  | Task | Dataset        | Classification  | Live raw |  Rows | Features | Baseline | Random | Holdout | Delta baseline | Delta holdout | Negative | Rival              | Notes                                                                                                                                        |
| ---------------------- | ---: | -------------- | --------------- | -------- | ----: | -------: | -------: | -----: | ------: | -------------: | ------------: | -------: | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| SA-PLAUS-003-OPENML-32 |   32 | pendigits      | replay_passed   | yes      | 10992 |       16 |    0.094 |  0.187 |   0.000 |          0.093 |         0.187 |    0.106 | scoped_or_weakened | loaded public OpenML task 32 and raw ARFF https://openml.org/data/v1/download/32/pendigits.arff; target=class; attributes=17; rows=10992     |
| SA-PLAUS-001-OPENML-28 |   28 | optdigits      | replay_weakened | yes      |  5620 |       64 |    0.090 |  0.098 |   0.085 |          0.008 |         0.013 |    0.110 | stronger           | loaded public OpenML task 28 and raw ARFF https://openml.org/data/v1/download/28/optdigits.arff; target=class; attributes=65; rows=5620      |
| SA-PLAUS-005-OPENML-22 |   22 | mfeat-zernike  | replay_weakened | yes      |  2000 |       47 |    0.077 |  0.080 |   0.087 |          0.003 |        -0.007 |    0.085 | stronger           | loaded public OpenML task 22 and raw ARFF https://openml.org/data/v1/download/22/mfeat-zernike.arff; target=class; attributes=48; rows=2000  |
| SA-PLAUS-006-OPENML-16 |   16 | mfeat-karhunen | replay_weakened | yes      |  2000 |       64 |    0.077 |  0.080 |   0.087 |          0.003 |        -0.007 |    0.085 | stronger           | loaded public OpenML task 16 and raw ARFF https://openml.org/data/v1/download/16/mfeat-karhunen.arff; target=class; attributes=65; rows=2000 |
| SA-PLAUS-004-OPENML-45 |   45 | splice         | replay_weakened | yes      |  3190 |       61 |    0.519 |  0.525 |   0.518 |          0.005 |         0.006 |    0.532 | stronger           | loaded public OpenML task 45 and raw ARFF https://openml.org/data/v1/download/46/splice.arff; target=Class; attributes=62; rows=3190         |
