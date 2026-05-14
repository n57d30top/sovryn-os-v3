# Prompt To Artifact Checklist

| Requirement                                                                                     | Evidence                                                                                                   | Status   |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| Load all evidence for candidate                                                                 | INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md/json                                                              | complete |
| Report claim, tasks, splits, recurrence, holdout, rivals, baselines, controls, replay, blockers | INSIGHT_TEMPORAL_RECURRENCE_INVENTORY.md                                                                   | complete |
| Check promotion readiness gates                                                                 | PROMOTION_READINESS_REPORT.md and PROMOTION_READINESS_DECISION.md                                          | complete |
| Run required kill-week attacks                                                                  | KILL_WEEK_PRESSURE_REPORT.md                                                                               | complete |
| Report baseline, rival, negative-control results                                                | BASELINE_DOMINANCE_RESULTS.md, RIVAL_EXPLANATION_RESULTS.md, NEGATIVE_CONTROL_RESULTS.md                   | complete |
| Build public-safe review package if not killed                                                  | EXTERNAL_REVIEW_PACKAGE_STATUS.md and external-review-package files                                        | complete |
| Decide DiscoveryCandidate/FundCandidateDraft/Fund Gate                                          | DISCOVERY_PROMOTION_DECISION.md and FUND_GATE_RESULTS.md                                                   | complete |
| Update stage scores, blockers, next action                                                      | UPDATED_THREE_STAGE_SCORECARD.md, FINAL_BLOCKERS.md, NEXT_ACTION.md                                        | complete |
| Preserve no fake Fund                                                                           | fundFound false; no FUND_FOUND.md written by this service                                                  | complete |
| Checkpoint                                                                                      | .sovryn/discovery-daemon/checkpoints/insight-temporal-recurrence-promotion-continue-searching.json         | complete |
| Verification                                                                                    | npm build/test/format/diff plus evidence, holdout, health, daemon, readiness, corpus, launch audits passed | complete |
