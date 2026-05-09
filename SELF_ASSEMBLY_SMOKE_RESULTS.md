# Self-Assembly Smoke Results

- flows: 10
- passed: 10
- failed: 0
- anti-cheat wired mechanisms: 20
- no FUND_FOUND created: true
- no tool-install-only discovery Fund: true
- no fake 100: true

## Anti-Cheat Wiring Criteria

- selected_by_upstream_planner_or_router
- actually_invoked_in_code_or_tested_execution_path
- produces_artifact
- artifact_consumed_by_downstream_mechanism
- integration_or_contract_test_proves_flow

## Mechanisms Counted As Wired

- corpus_index_graph_export
- corpus_product_site
- cross_domain_router
- daemon_fund_candidate_draft
- daemon_fund_gate
- daemon_hard_seeds
- daemon_mechanism_router
- dataset_audit_domain_pack
- domain_packs
- formal_counterexample_domain_pack
- knowledge_engine
- lab_service
- nobel_readiness
- os_v16_capability_closure
- repo_package_reproduction_domain_pack
- science_service
- scientific_public_data_triage_domain_pack
- strategy_service
- temporal_evaluation_domain_pack
- theory_engine

## A. Corpus anomaly -> Research Strategist -> candidate direction

- passed: true
- mechanisms: corpus_index_graph_export, strategy_service
- consumed inputs: MECHANISM_MAP.json, public/local corpus signals
- produced artifacts: .sovryn/corpus/public/corpus-graph.json, .sovryn/strategy/ranking/top-opportunities.json, .sovryn/self-assembly/candidate-domain-priority.json
- downstream consumption: candidate-domain-priority consumes Corpus graph export and Research Strategist output.
- anti-cheat proofs: 2/2
- notes: Strategy ranking changes the next candidate direction without claiming discovery.

## B. HardSeed -> MechanismRouter -> Domain Pack execution

- passed: true
- mechanisms: daemon_hard_seeds, daemon_mechanism_router, domain_packs
- consumed inputs: HardSeed-shaped candidate, MechanismRouter catalog
- produced artifacts: .sovryn/self-assembly/hard-seed-intake-contract.json, .sovryn/discovery-daemon/mechanism-executions/SELF-ASSEMBLY-SMOKE-SELF-ASSEMBLY-HARD-SEED-DATASET.json
- downstream consumption: MechanismPlanExecution records selected domain-pack output refs.
- anti-cheat proofs: 12/12
- notes: candidateType=materials_public_data_candidate

## C. Tool acquisition -> Computational Scientist pipeline -> evidence package

- passed: true
- mechanisms: lab_service, science_service, domain_packs
- consumed inputs: bounded tool need, computational science question
- produced artifacts: .sovryn/lab/needs/latest.json, .sovryn/science, .sovryn/self-assembly/tool-science-evidence-package.json
- downstream consumption: Lab and Science outputs are bound into an evidence package contract.
- anti-cheat proofs: 2/2
- notes: Tool acquisition is explicitly not a discovery Fund.

## D. Repo target -> repo reproduction -> replay/package/corpus

- passed: true
- mechanisms: repo_package_reproduction_domain_pack, cross_domain_router, os_v16_capability_closure, corpus_product_site
- consumed inputs: repo-target-001, route public package index
- produced artifacts: .sovryn/repo/instrument-runs.json, .sovryn/self-assembly/package-replay-corpus-contract.json
- downstream consumption: Repo reproduction output is joined to replay and corpus-audit readiness.
- anti-cheat proofs: 10/10
- notes: Repo reproduction remains a reproduction path, not a discovery-score path.

## E. Dataset target -> dataset audit -> insight candidate if evidence warrants

- passed: true
- mechanisms: dataset_audit_domain_pack, scientific_public_data_triage_domain_pack
- consumed inputs: public dataset target
- produced artifacts: .sovryn/discovery-daemon/mechanism-executions/SELF-ASSEMBLY-DATASET-SMOKE-SELF-ASSEMBLY-DATASET-TARGET.json
- downstream consumption: Dataset audit can emit an insight-candidate direction only when evidence warrants.
- anti-cheat proofs: 10/10
- notes: disposition=insight_candidate

## F. Formal target -> proof/refutation route -> counterexample package

- passed: true
- mechanisms: formal_counterexample_domain_pack
- consumed inputs: proof-target-001
- produced artifacts: .sovryn/discovery-daemon/mechanism-executions/SELF-ASSEMBLY-FORMAL-SMOKE-SELF-ASSEMBLY-FORMAL-TARGET.json
- downstream consumption: Formal route output is available to package as proof/refutation pressure.
- anti-cheat proofs: 7/7
- notes: No checked-proof claim is made unless the existing formal route supports it.

## G. Temporal target -> temporal route -> caveated package

- passed: true
- mechanisms: temporal_evaluation_domain_pack
- consumed inputs: temporal-target-001
- produced artifacts: .sovryn/discovery-daemon/mechanism-executions/SELF-ASSEMBLY-TEMPORAL-SMOKE-SELF-ASSEMBLY-TEMPORAL-TARGET.json
- downstream consumption: Temporal route output remains caveated and package-ready.
- anti-cheat proofs: 7/7
- notes: Long-horizon and replay caveats are preserved.

## H. Candidate -> Nobel-readiness gates -> FundCandidateDraft or graveyard

- passed: true
- mechanisms: nobel_readiness, daemon_fund_candidate_draft, daemon_fund_gate
- consumed inputs: Nobel-readiness criteria, empty candidate gate guard
- produced artifacts: .sovryn/self-assembly/nobel-disposition-contract.json
- downstream consumption: Candidate disposition fails closed to graveyard without a real gate-passing candidate.
- anti-cheat proofs: 3/3
- notes: No FUND_FOUND can be emitted without the unchanged Fund Gate passing.

## I. Evidence package -> replay -> corpus status

- passed: true
- mechanisms: cross_domain_router, os_v16_capability_closure, corpus_product_site
- consumed inputs: .sovryn/route/public-packages.json, .sovryn/os-v1_6/replay-coverage.json
- produced artifacts: .sovryn/self-assembly/package-replay-corpus-contract.json
- downstream consumption: Replay coverage and route package manifest are bound to corpus audit status.
- anti-cheat proofs: 2/2
- notes: No corpus publication is performed by the smoke flow.

## J. Knowledge Engine output -> next candidate/domain priority

- passed: true
- mechanisms: knowledge_engine, strategy_service, daemon_mechanism_router
- consumed inputs: .sovryn/knowledge/claim-graph/claim-graph.json, .sovryn/strategy/ranking/top-opportunities.json
- produced artifacts: .sovryn/self-assembly/candidate-domain-priority.json
- downstream consumption: Knowledge claim graph and strategy ranking choose the next candidate/domain priority.
- anti-cheat proofs: 2/2
- notes: Priority is a candidate direction, not a discovery claim.
