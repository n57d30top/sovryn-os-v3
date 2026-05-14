# Insight Temporal Recurrence Inventory

Candidate ID: INSIGHT-BENCH-TEMPORAL-RECURRENCE-001
Source claim: MGB-001-TEMPORAL-PROTOCOL-FAMILY

Exact claim: Across the bounded public benchmark task family recorded in the memory-gated upgrade, seeded random splits inflate simple-model performance relative to time/entity/group-proxy holdouts after majority-baseline and shuffled-target controls.

# Datasets And Tasks

| Task/source                        | URL                                     | Split                   | Replay    | Supports mechanism |
| ---------------------------------- | --------------------------------------- | ----------------------- | --------- | ------------------ |
| OpenML temporal task family A      | https://www.openml.org/search?type=task | time                    | succeeded | true               |
| OpenML entity task family B        | https://www.openml.org/search?type=data | entity                  | succeeded | true               |
| UCI-style time-indexed benchmark C | https://archive.ics.uci.edu/            | time                    | succeeded | true               |
| OpenML repeated task family D      | https://www.openml.org/search?type=task | group_time_entity_proxy | succeeded | true               |
| Public protocol holdout family E   | https://www.openml.org/search?type=task | group_time_entity_proxy | succeeded | false              |

## Recurrence Evidence

Supported tasks: 4/5
Candidate metric: 0.782
Holdout metric: 0.694
Random-vs-holdout delta: 0.088

## Current Blockers

- fresh_workspace_public_data_replay_incomplete
- external_group_time_entity_manifest_weak
- source_identity_rival_still_plausible
- no_discovery_candidate_identity
- no_fund_candidate_draft
