# Self-Assembly Fixes

Applied or verified 4 concrete wiring fixes from the mechanism map.

## SA-FIX-001: Validate MECHANISM_MAP.json as executable source of truth

- status: applied
- source finding: Primary task requirement 1
- affected mechanisms: all
- expected contract: SelfAssemblyPlanner.loadMechanismMap rejects missing or malformed map entries.
- artifacts: SELF_ASSEMBLY_PLAN.json
- Fund Gate affected: false
- speculative: false

## SA-FIX-002: Verify daemon-selected mechanisms execute through existing modules

- status: verified_existing
- source finding: MECHANISM_WIRING_FINDINGS.md P1-001
- affected mechanisms: daemon_mechanism_router, domain_packs
- expected contract: MechanismRouter selections are executed by MechanismPlanExecutor and produce artifact refs.
- artifacts: .sovryn/discovery-daemon/mechanism-executions/\*.json
- Fund Gate affected: false
- speculative: false

## SA-FIX-003: Connect Strategy and Knowledge outputs to candidate/domain priority

- status: applied
- source finding: DAEMON_USAGE_REALITY_CHECK.md knowledge/strategy caveats
- affected mechanisms: strategy_service, knowledge_engine
- expected contract: candidate-domain-priority consumes strategy top opportunity and knowledge claim graph.
- artifacts: .sovryn/self-assembly/candidate-domain-priority.json
- Fund Gate affected: false
- speculative: false

## SA-FIX-004: Bind route package, replay coverage, and corpus audit status

- status: applied
- source finding: MECHANISM_WIRING_FINDINGS.md P2-001
- affected mechanisms: cross_domain_router, os_v16_capability_closure, corpus_product_site
- expected contract: package-replay-corpus-contract links route public packages to replay coverage and corpus audit readiness.
- artifacts: .sovryn/self-assembly/package-replay-corpus-contract.json
- Fund Gate affected: false
- speculative: false

## SA-FIX-005: Defer protected Fund state reconciliation

- status: deferred_protected_state
- source finding: MECHANISM_WIRING_FINDINGS.md P1-002/P1-003
- affected mechanisms: daemon_fund_gate, os_v16_capability_closure
- expected contract: Self-assembly refuses to mutate existing Fund state or candidate identity paths.
- artifacts: UNWIRED_MECHANISMS_AFTER.md
- Fund Gate affected: false
- speculative: false
