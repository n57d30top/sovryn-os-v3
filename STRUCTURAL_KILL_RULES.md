# Structural Kill Rules

These rules are promoted from structural observations into enforced pre-execution Strategy/Knowledge memory. They do not weaken any gate; they stop known-bad patterns before expensive execution unless a material change is present.

| Rule    | Death pattern                             | Strategy action                 | Material change required                                                                          |
| ------- | ----------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| SKR-001 | single_task_fragility_signal              | block_before_execution          | new independent task family with group/time/entity split and recurrence support                   |
| SKR-002 | rival_theory_stronger                     | block_before_execution          | explicit rival-discriminating design where candidate and rival make different predictions         |
| SKR-003 | baseline_dominated                        | block_before_execution          | predeclared reason that comparable null/simple baseline should not dominate                       |
| SKR-004 | known_trivial_or_source_family_documented | block_before_execution          | external claim or public object whose value is not absorbed by source family documentation        |
| SKR-005 | human_curated_input_required              | block_before_execution          | exact external claim, falsifier, public object, and nonstandard witness value                     |
| SKR-006 | no_valid_witness_or_counterexample        | block_before_execution          | validatable certificate or checked counterexample that scopes a rival                             |
| SKR-007 | standard_witness_absorbed                 | block_before_execution          | nonstandard witness or refutation whose value is not a textbook certificate                       |
| SKR-008 | replay_failed                             | block_before_execution          | public raw inputs, source objects, or deterministic reconstruction sufficient for external replay |
| SKR-009 | weak_holdout_group_time_entity_support    | allow_only_with_material_change | documented group/time/entity split manifest and recurrence/holdout evidence                       |
