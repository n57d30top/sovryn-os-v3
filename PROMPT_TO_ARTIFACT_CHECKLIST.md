# Prompt To Artifact Checklist

| Requirement                                                                          | Evidence                                                                                                   | Status   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------- |
| Collect at least 20 claims                                                           | MEMORY_GATED_EXTERNAL_CLAIMS.md                                                                            | complete |
| Require group/time/entity/repeated/protocol/baseline source evidence                 | GROUP_TIME_ENTITY_SOURCE_AUDIT.md                                                                          | complete |
| Run Strategy Memory Gate before execution                                            | MEMORY_GATED_EXTERNAL_CLAIMS.md gate column                                                                | complete |
| Reject old kill rules without material evidence                                      | MEMORY_GATED_EXTERNAL_CLAIMS.md and TOP5_MEMORY_GATED_CLAIMS.md                                            | complete |
| Select top 5 memory-gated claims                                                     | TOP5_MEMORY_GATED_CLAIMS.md                                                                                | complete |
| Deep-run top 3                                                                       | TOP3_DEEP_VALIDATION_RESULTS.md                                                                            | complete |
| Freeze claims and run baseline, holdout, rival, recurrence, negative control, replay | TOP3_DEEP_VALIDATION_RESULTS.md and RECURRENCE_RIVAL_HOLDOUT_REPORT.md                                     | complete |
| Decide InsightCandidate birth                                                        | INSIGHT_BIRTH_DECISIONS.md                                                                                 | complete |
| Update stage scores                                                                  | UPDATED_THREE_STAGE_SCORECARD.md                                                                           | complete |
| Preserve no fake Fund                                                                | fundFound false; no FUND_FOUND.md written by this service                                                  | complete |
| Checkpoint                                                                           | .sovryn/discovery-daemon/checkpoints/memory-gated-benchmark-upgrade-continue-searching.json                | complete |
| Verification                                                                         | npm build/test/format/diff plus evidence, holdout, health, daemon, readiness, corpus, launch audits passed | complete |
