# Kill Week Pressure Report

Overall classification: weakened.

| Attack                              | Classification | Fatal | Result                                                                                                                                  |
| ----------------------------------- | -------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| stronger temporal baseline          | weakened       | false | Persistence/cadence baseline narrows the random-vs-holdout residual from 0.088 to 0.041; not baseline dominated, but margin is thinner. |
| random vs temporal split comparison | survived       | false | Random split remains above time/entity holdout after repeated bounded replay.                                                           |
| leakage/source-identity check       | weakened       | false | Source-family identity remains plausible because concrete per-task group manifests are not fully externalized.                          |
| duplicate/entity overlap check      | survived       | false | Duplicate/entity overlap is below the fatal threshold in the bounded package.                                                           |
| label/time drift check              | weakened       | false | Time drift contributes to the delta and scopes the claim to protocol fragility rather than a broad leakage law.                         |
| metric sensitivity                  | survived       | false | The sign of the delta remains stable under the bounded accuracy/balanced-accuracy comparison.                                           |
| shuffled-target negative control    | survived       | false | Shuffled-target control falls near simple baseline and does not suggest target leakage dominance.                                       |
| simple baseline dominance check     | survived       | false | Majority/simple baseline remains below candidate metric and does not fully explain the signal.                                          |
| fresh workspace replay              | inconclusive   | true  | Package replay succeeds, but a fully independent fresh-workspace public-data replay is not yet available.                               |
