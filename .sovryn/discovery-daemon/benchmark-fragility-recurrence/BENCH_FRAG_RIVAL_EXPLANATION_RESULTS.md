# Benchmark Fragility Rival Explanation Results

| Rival explanation | Classification | Rationale |
| --- | --- | --- |
| class imbalance | weakened | Majority baseline is not high enough to explain the split delta alone. |
| dataset size artifact | still_plausible | Rows loaded and replay variance were compared against a small-sample instability threshold. |
| group definition artifact | still_plausible | The holdout is a feature-family proxy rather than a documented external group, so high group-offset sensitivity keeps this rival alive. |
| metric artifact | weakened | Replay compared the primary balanced metric against simple model behavior. |
| model instability | weakened | Repeated random-split variance tests whether the signal is mostly seed instability. |
| duplicate/near-duplicate leakage | weakened | Exact feature-signature overlap between train and test estimates duplicate leakage pressure. |
| target encoding leakage | weakened | Shuffled-target control should fall near majority baseline if target leakage is not dominating. |
| preprocessing artifact | inconclusive | The pilot uses minimal categorical parsing and one-feature lookup; stronger preprocessing audits are still needed before discovery promotion. |
