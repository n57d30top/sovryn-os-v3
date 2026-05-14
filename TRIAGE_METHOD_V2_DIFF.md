# Triage Method V2 Diff

| Area               | V1                                                           | V2                                                                        |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Recurrence         | Same-mechanism row count                                     | Unique OpenML task count                                                  |
| Same-task variants | Could compound support                                       | Suppressed after first plausible selected task                            |
| Weak claims        | Same score threshold as all classes                          | Higher 0.72 advancement threshold                                         |
| Positive controls  | Counted in mixed retention                                   | Retained only as sanity checks; promotion cannot be positive-control-only |
| Concentration      | Not explicit                                                 | Reports selected-task concentration and independent-task retention        |
| Promotion          | Required plausible support but allowed concentration failure | Requires 2+ plausible non-control survivors from 2+ tasks                 |
