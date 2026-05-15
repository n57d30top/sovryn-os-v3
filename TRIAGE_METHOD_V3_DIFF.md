# Triage Method V3 Diff

| Area              | V2                                        | V3                                                                    |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| Plausible labels  | Internally constructed plausible class    | Requires external source rationale and label audit                    |
| Positive controls | Retained as sanity checks                 | Explicitly not selected as discovery-supporting claims                |
| Objective         | Accuracy and false rejection              | Plausible non-control retention plus deep-validation truth            |
| Promotion         | Needs two independent plausible survivors | Same, plus no positive-control-only support                           |
| Failure mode      | positive_control_only_retention           | reports whether external plausibility survives actual replay pressure |
