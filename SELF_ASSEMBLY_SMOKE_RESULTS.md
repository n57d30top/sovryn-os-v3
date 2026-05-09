# Self-Assembly Smoke Results

- flows: 10
- passed: 10
- failed: 0
- no FUND_FOUND created: true
- no tool-install-only discovery Fund: true
- no fake 100: true

## A. Corpus anomaly -> Research Strategist -> candidate direction

- passed: true
- mechanisms: corpus_index_graph_export, strategy_service
- consumed inputs: MECHANISM_MAP.json, public/local corpus signals
- produced artifacts: .sovryn/strategy/ranking/top-opportunities.json, .sovryn/self-assembly/candidate-domain-priority.json
- downstream consumption: candidate-domain-priority consumes Research Strategist output.
- notes: Strategy ranking changes the next candidate direction without claiming discovery.

## B. HardSeed -> MechanismRouter -> Domain Pack execution

- passed: true
- mechanisms: daemon_hard_seeds, daemon_mechanism_router, domain_packs
- consumed inputs: HardSeed-shaped candidate, MechanismRouter catalog
- produced artifacts: .sovryn/discovery-daemon/mechanism-executions/SELF-ASSEMBLY-SMOKE-SELF-ASSEMBLY-HARD-SEED-DATASET.json
- downstream consumption: MechanismPlanExecution records selected domain-pack output refs.
- notes: candidateType=materials_public_data_candidate

## C. Tool acquisition -> Computational Scientist pipeline -> evidence package

- passed: true
- mechanisms: lab_service, science_service, domain_packs
- consumed inputs: bounded tool need, computational science question
- produced artifacts: .sovryn/lab/needs/latest.json, .sovryn/science, .sovryn/self-assembly/tool-science-evidence-package.json
- downstream consumption: Lab and Science outputs are bound into an evidence package contract.
- notes: Tool acquisition is explicitly not a discovery Fund.

## D. Repo target -> repo reproduction -> replay/package/corpus

- passed: true
- mechanisms: repo_package_reproduction_domain_pack, cross_domain_router, corpus_product_site
- consumed inputs: repo-target-001, route public package index
- produced artifacts: .sovryn/repo/instrument-runs.json, .sovryn/self-assembly/package-replay-corpus-contract.json
- downstream consumption: Repo reproduction output is joined to replay and corpus-audit readiness.
- notes: Repo reproduction remains a reproduction path, not a discovery-score path.

## E. Dataset target -> dataset audit -> insight candidate if evidence warrants

- passed: true
- mechanisms: dataset_audit_domain_pack, scientific_public_data_triage_domain_pack
- consumed inputs: public dataset target
- produced artifacts: .sovryn/route/last-execution.json
- downstream consumption: Dataset audit can emit an insight-candidate direction only when evidence warrants.
- notes: disposition=insight_candidate

## F. Formal target -> proof/refutation route -> counterexample package

- passed: true
- mechanisms: formal_counterexample_domain_pack
- consumed inputs: proof-target-001
- produced artifacts: .sovryn/formal/proof-attempts.json
- downstream consumption: Formal route output is available to package as proof/refutation pressure.
- notes: No checked-proof claim is made unless the existing formal route supports it.

## G. Temporal target -> temporal route -> caveated package

- passed: true
- mechanisms: temporal_evaluation_domain_pack
- consumed inputs: temporal-target-001
- produced artifacts: .sovryn/temporal/instrument-runs.json
- downstream consumption: Temporal route output remains caveated and package-ready.
- notes: Long-horizon and replay caveats are preserved.

## H. Candidate -> Nobel-readiness gates -> FundCandidateDraft or graveyard

- passed: true
- mechanisms: nobel_readiness, daemon_fund_candidate_draft, daemon_fund_gate
- consumed inputs: Nobel-readiness criteria, empty candidate gate guard
- produced artifacts: .sovryn/self-assembly/nobel-disposition-contract.json
- downstream consumption: Candidate disposition fails closed to graveyard without a real gate-passing candidate.
- notes: No FUND_FOUND can be emitted without the unchanged Fund Gate passing.

## I. Evidence package -> replay -> corpus status

- passed: true
- mechanisms: cross_domain_router, os_v16_capability_closure, corpus_product_site
- consumed inputs: .sovryn/route/public-packages.json, .sovryn/os-v1_6/replay-coverage.json
- produced artifacts: .sovryn/self-assembly/package-replay-corpus-contract.json
- downstream consumption: Replay coverage and route package manifest are bound to corpus audit status.
- notes: No corpus publication is performed by the smoke flow.

## J. Knowledge Engine output -> next candidate/domain priority

- passed: true
- mechanisms: knowledge_engine, strategy_service, daemon_mechanism_router
- consumed inputs: .sovryn/knowledge/claim-graph/claim-graph.json, .sovryn/strategy/ranking/top-opportunities.json
- produced artifacts: .sovryn/self-assembly/candidate-domain-priority.json
- downstream consumption: Knowledge claim graph and strategy ranking choose the next candidate/domain priority.
- notes: Priority is a candidate direction, not a discovery claim.
