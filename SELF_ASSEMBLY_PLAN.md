# Self-Assembly Plan

Sovryn loaded `MECHANISM_MAP.json` as the source of truth and found 53 mechanisms, including 24 daemon-used mechanisms.

## Underused Mechanisms

- plugin_api
- general_scientist_service
- tool_usefulness_domain_pack
- discovery_validation
- bounded_discovery_service
- nobel_discovery_portfolio
- frontier_production
- reality_field_operations
- external_production_reproduction
- external_research_trials

## Manual-Only Mechanisms

- plugin_api
- general_scientist_service
- tool_usefulness_domain_pack
- discovery_validation
- bounded_discovery_service
- nobel_discovery_portfolio
- frontier_production
- external_production_reproduction

## Selected But Not Executed

None for new mechanism-plan execution contracts.

## Missing Contracts

- fund_state_os_closure_reconciliation: Existing local Fund state and OS closure accounting require protected read-only reconciliation before mutation. (P1, protected state)
- fund_candidate_identity_path_reconciliation: Existing local Fund candidate ID/path mismatch must not be rewritten by self-assembly. (P1, protected state)
- route_package_replay_corpus_direct_contract: Route package, replay, and corpus status should be validated as one direct contract. (P2)
- package_scout_live_intake_quality: Package scout remains a weak live intake channel and should stay non-promotional until inspectability improves. (P2)
- strategy_knowledge_priority_bridge: Research Strategist and Knowledge Engine outputs need a consumable candidate/domain priority artifact. (P3)

## Fix Policy

- No new generic layer.
- No Fund Gate changes.
- No fake Fund.
- No tool-install-only discovery Fund.
- No fake 100 claim.
