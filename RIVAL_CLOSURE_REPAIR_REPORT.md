# Rival Closure Repair Report

| Rival                     | Status          | Evidence                                                                               |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| temporal leakage          | still_plausible | time key missing for 5 manifests; public replay/manifests are incomplete               |
| entity leakage            | still_plausible | entity key missing for 5 manifests; duplicate overlap cannot be recomputed             |
| source identity leakage   | still_plausible | source refs are family URLs rather than concrete task/data IDs                         |
| duplicate overlap         | still_plausible | raw rows and entity keys are unavailable for fresh overlap checks                      |
| label/time drift          | still_plausible | cannot recompute time-ordered label distribution without time field                    |
| simple baseline dominance | weakened        | prior internal package baseline did not dominate, but public rerun is blocked          |
| metric sensitivity        | weakened        | prior bounded package kept delta sign stable; public metric replay remains unavailable |
