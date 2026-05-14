# Top 3 Deep Validation Results

| Claim                                   | Classification   | Baseline | Candidate | Holdout | Recurrence | Rival              | Replay    | Caveat                                                                                                                         |
| --------------------------------------- | ---------------- | -------: | --------: | ------: | ---------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| MGB-001-TEMPORAL-PROTOCOL-FAMILY        | InsightCandidate |    0.641 |     0.782 |   0.694 | 4/5        | scoped_or_weakened | succeeded | recurs across four of five public time/entity split tasks; cadence rival is scoped by shuffled-target and persistence controls |
| MGB-002-ENTITY-DUPLICATE-LEAKAGE-FAMILY | weakened         |    0.603 |     0.712 |   0.681 | 1/4        | rival_stronger     | succeeded | duplicate/entity baseline explains most of the delta after ablation; recurrence is too weak for InsightCandidate birth         |
| MGB-003-METRIC-IMBALANCE-FAMILY         | inconclusive     |    0.551 |     0.617 |   0.602 | 2/4        | still_plausible    | succeeded | metric artifact rival remains plausible because balanced-accuracy reversal is not stable under the entity holdout              |
