# External Claim Validation Results

| Claim                         | Domain                     | Classification | Deep? | Replayable? | Death/caveat                                                                   |
| ----------------------------- | -------------------------- | -------------- | ----- | ----------- | ------------------------------------------------------------------------------ |
| BENCH-FRAG-001-OPENML-3       | benchmark fragility        | killed         | yes   | yes         | recurrence support was 1/10 and replay stability did not close                 |
| BENCH-FRAG-002-OPENML-6       | benchmark fragility        | killed         | no    | yes         | metric delta insufficient after controls                                       |
| BENCH-FRAG-003-OPENML-11      | benchmark fragility        | killed         | no    | yes         | simple baseline dominated                                                      |
| BENCH-FRAG-004-OPENML-12      | benchmark fragility        | weakened       | no    | yes         | delta did not clear threshold                                                  |
| BENCH-FRAG-005-OPENML-14      | benchmark fragility        | weakened       | no    | yes         | delta did not clear threshold                                                  |
| BENCH-FRAG-006-OPENML-15      | benchmark fragility        | weakened       | no    | yes         | delta did not clear threshold                                                  |
| BENCH-FRAG-007-OPENML-16      | benchmark fragility        | inconclusive   | no    | yes         | single recurrence task is not enough for promotion                             |
| BENCH-FRAG-008-OPENML-18      | benchmark fragility        | killed         | no    | yes         | baseline dominated                                                             |
| STAGE6-BENCH-MFEAT-FAMILY     | benchmark fragility        | weakened       | yes   | yes         | source-family rival remains stronger                                           |
| STAGE6-DATA-PROV-MATBENCH-RAW | materials data reliability | killed         | yes   | yes         | raw descriptor, split manifest, and scientific residual formula remain missing |

Deep validations: 3. At least one top claim was killed or strongly weakened with replayable evidence.
