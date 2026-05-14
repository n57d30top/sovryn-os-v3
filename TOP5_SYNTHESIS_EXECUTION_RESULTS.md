# Top 5 Synthesis Execution Results

| Candidate | Type                           | Decision      | Insight born? | Blocker                           |
| --------- | ------------------------------ | ------------- | ------------- | --------------------------------- |
| SYN-01    | split_leakage_detector         | top5_executed | no            | no_new_candidate_only_rule        |
| SYN-02    | benchmark_audit_method         | top5_executed | no            | kill_rule_not_discovery_candidate |
| SYN-03    | reproducibility_checker        | top5_executed | no            | checker_blocks_false_promotion    |
| SYN-04    | data_reliability_heuristic     | top5_executed | no            | heuristic_not_insight_candidate   |
| SYN-05    | formal_refutation_witness_path | top5_executed | no            | strategy_rule_not_candidate       |

The top 5 produced useful rules and checkers, but no fresh InsightCandidate.
