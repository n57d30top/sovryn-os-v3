# Rejected Source Family Only Claims

| Claim                             | Source                                                          | Reason                                                                                                 |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| REJECT-SOURCE-FAMILY-TEMPORAL-001 | https://www.openml.org/search?type=task                         | source-family-only: no concrete task ID, dataset ID, raw-data receipt, or deterministic split manifest |
| REJECT-SOURCE-FAMILY-MFEAT-002    | https://www.openml.org/search?type=data&sort=runs&status=active | source-family-only: repeated tasks from one family without concrete supporting task receipts           |
| REJECT-SOURCE-FAMILY-PWC-003      | https://paperswithcode.com/                                     | source-family-only: public benchmark page lacks concrete task/data receipt and replay command          |
| REJECT-SOURCE-FAMILY-UCI-004      | https://archive.ics.uci.edu/                                    | source-family-only: no per-dataset raw receipt, group/time/entity key, or split manifest               |
| REJECT-SOURCE-FAMILY-REPO-005     | https://github.com/                                             | source-family-only: package/source family metadata is not benchmark/data replay evidence               |
