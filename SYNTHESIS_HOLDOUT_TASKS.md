# Synthesis Holdout Tasks

Top-3 tasks from the prior run are excluded from evaluation.

| Claim             | Task | Dataset             | Mechanism                         | Receipt                                    | Split manifest                                                |
| ----------------- | ---: | ------------------- | --------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| TRB-004-OPENML-6  |    6 | letter              | protocol_repeated_split_fragility | https://www.openml.org/api/v1/json/data/6  | seeded 70/30 repeated split seeds 17..59                      |
| TRB-005-OPENML-11 |   11 | balance-scale       | class_imbalance_artifact          | https://www.openml.org/api/v1/json/data/11 | seeded stratified split with class-prior baseline             |
| TRB-006-OPENML-12 |   12 | mfeat-factors       | group_holdout_fragility           | https://www.openml.org/api/v1/json/data/12 | hold out mfeat-family-compatible feature bucket               |
| TRB-007-OPENML-14 |   14 | mfeat-fourier       | metric_sensitivity                | https://www.openml.org/api/v1/json/data/14 | seeded split; compute accuracy and balanced accuracy          |
| TRB-008-OPENML-15 |   15 | breast-w            | duplicate_leakage                 | https://www.openml.org/api/v1/json/data/15 | exact feature-signature duplicate exclusion then replay split |
| TRB-009-OPENML-16 |   16 | mfeat-karhunen      | group_holdout_fragility           | https://www.openml.org/api/v1/json/data/16 | hold out feature bucket and compare with same-family tasks    |
| TRB-010-OPENML-18 |   18 | mfeat-morphological | protocol_repeated_split_fragility | https://www.openml.org/api/v1/json/data/18 | repeated split plus source-family holdout comparison          |
| TRB-011-OPENML-22 |   22 | mfeat-zernike       | group_holdout_fragility           | https://www.openml.org/api/v1/json/data/22 | source-family feature-bucket holdout                          |
| TRB-012-OPENML-23 |   23 | cmc                 | class_imbalance_artifact          | https://www.openml.org/api/v1/json/data/23 | seeded split with accuracy and balanced accuracy              |
| TRB-013-OPENML-28 |   28 | optdigits           | distribution_shift                | https://www.openml.org/api/v1/json/data/28 | feature-bucket holdout                                        |
