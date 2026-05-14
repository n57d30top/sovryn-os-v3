# Fresh Workspace Replay Report

Status: replay_blocked.
Fresh workspace path: .sovryn/discovery-daemon/insight-temporal-replay-repair/fresh-workspace.

| Step                                   | Status  | Evidence                                                                |
| -------------------------------------- | ------- | ----------------------------------------------------------------------- |
| reload public data                     | blocked | no concrete task/data IDs or raw-data receipts are bound                |
| reconstruct splits from manifests      | blocked | 5/5 manifests are blocking                                              |
| rerun baselines and holdouts           | blocked | baseline/holdout rerun requires raw rows, target schema, and split rows |
| rerun recurrence and negative controls | blocked | recurrence cannot be independently recomputed from source-family URLs   |

Prior internal random-vs-holdout delta: 0.088.

Prior Product-package recurrence remains recorded, but public fresh-workspace replay did not produce an independent measurement.

DiscoveryCandidate created: false.
