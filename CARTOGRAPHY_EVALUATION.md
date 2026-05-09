# Cartography Evaluation

## Scope

This evaluation covers the existing cartography artifacts generated in this workspace:

- `MECHANISM_MAP.md`
- `MECHANISM_MAP.json`
- `COMMAND_TO_MECHANISM_MATRIX.md`
- `ARTIFACT_FLOW_MAP.md`
- `DAEMON_MECHANISM_INTEGRATION.md`
- `FUND_PIPELINE_MAP.md`
- `OS_ROUTE_PIPELINE_MAP.md`
- `CAPABILITY_STATUS_LEDGER.md`
- `UNUSED_OR_UNDERUSED_MECHANISMS.md`
- `EINSTEIN_NOBEL_BOTTLENECKS.md`
- `SYSTEM_CARTOGRAPHY_SUMMARY.md`

It also cross-checks the relevant implementation surfaces in `src/core/**`,
`src/cli/index.ts`, tests, `graphify-out/GRAPH_REPORT.md`, and local `.sovryn`
artifact roots where safe.

## What Mechanisms Exist

`MECHANISM_MAP.json` enumerates 53 mechanisms across 15 categories:

| Category                | Count |
| ----------------------- | ----: |
| `core_kernel`           |     7 |
| `corpus_publication`    |     4 |
| `cross_domain_os`       |     4 |
| `discovery`             |     2 |
| `discovery_daemon`      |     7 |
| `domain_pack`           |     8 |
| `extension`             |     1 |
| `factory`               |     1 |
| `frontier_operations`   |     4 |
| `knowledge`             |     1 |
| `open_invention`        |     1 |
| `operations`            |     4 |
| `research_ops`          |     2 |
| `science_lab`           |     3 |
| `strategy_theory_nobel` |     4 |

Status distribution in the map:

| Status                       | Count |
| ---------------------------- | ----: |
| `release_grade_100`          |     8 |
| `release_grade_with_caveats` |    40 |
| `partial`                    |     5 |
| `unused`                     |     0 |
| `unknown`                    |     0 |

The CLI matrix maps 67 top-level command families to mechanisms, artifact
roots, evidence, and verification commands. The cartography maps more than 30
artifact roots, with `.sovryn/discovery-daemon`, `.sovryn/route`,
`.sovryn/corpus`, `.sovryn/os`, `.sovryn/science`, `.sovryn/lab`,
`.sovryn/knowledge`, `.sovryn/strategy`, `.sovryn/nobel-readiness`,
`.sovryn/formal`, `.sovryn/repo`, and `.sovryn/temporal` as major roots.

## Which Mechanisms Are Daemon-Used

`MECHANISM_MAP.json` marks 24 mechanisms as `daemonUsed: true`.

The daemon-specific router catalog in
`src/core/discovery-daemon/discovery-daemon-service.ts` selects 14 mechanism
tool IDs:

| Tool ID                      | Current daemon role                                    |
| ---------------------------- | ------------------------------------------------------ |
| `research_strategist`        | Always selected core prioritization context            |
| `knowledge_engine`           | Always selected knowledge context                      |
| `cross_domain_router`        | Always selected route planner                          |
| `domain_packs`               | Always selected domain evidence package framing        |
| `rival_theory_pressure`      | Always selected rival pressure                         |
| `nobel_readiness_gates`      | Always selected Nobel/Fund-style criteria              |
| `computational_scientist`    | Materials, astro, climate, and dataset-like candidates |
| `lab_tooling`                | Materials, astro, climate, and dataset-like candidates |
| `formal_proof_route`         | Formal candidates                                      |
| `repo_deep_reproduction`     | Repo/package candidates                                |
| `temporal_v2`                | Temporal candidates                                    |
| `dataset_public_data_triage` | Dataset/materials/astro/climate candidates             |
| `benchmark_protocol_audit`   | Benchmark protocol candidates                          |
| `claim_safety_review`        | Claim/principle candidates                             |

Before this pass, these tools were selected into `MechanismPlan` artifacts but
not executed as module invocations by the daemon cycle. The P1 wiring fix in
this pass adds a `MechanismPlanExecutor` and downstream consumption of its
execution artifacts.

## Which Mechanisms Are Unused Or Underused

The unused/underused mechanisms are not absent from the product; they are
outside the daemon router or only indirectly connected to the Fund path.

| Mechanism area                                    | Reality                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mission, worktree, runner, verify, review, policy | Core engineering kernel, not daemon candidate search.                                             |
| Bounded `DiscoveryService`                        | Separate discovery workflow; daemon owns its own loop.                                            |
| General computational scientist                   | Exists as a CLI/module surface but is not selected by `MechanismRouter`.                          |
| Open invention and factory                        | Produces invention/package artifacts, not part of daemon candidate execution.                     |
| External research and overnight operator          | Operational research paths, not selected by daemon router.                                        |
| External production/reproduction                  | Relevant to external readiness, but not selected by daemon router.                                |
| Frontier, reality-grade, field-grade              | Grading/production readiness paths, not directly selected by daemon.                              |
| Publication governance and autopublish            | Corpus/publication path, not candidate mechanism execution.                                       |
| Security/reliability/safety services              | Operational gates, not science candidate tools.                                                   |
| Plugin API                                        | Extension surface with no direct daemon use.                                                      |
| Worker/node manager                               | Infrastructure support, not a candidate mechanism.                                                |
| Package scout                                     | Exists in daemon context but local scout evidence showed staged count 0 in the prior cartography. |

Selected but still caveated mechanisms include `knowledge_engine`,
`computational_scientist`, `domain_packs`, and `nobel_readiness_gates`: after
the P1 fix they are invoked, but the daemon still runs bounded contract
invocations rather than every standalone CLI workflow behind those modules.

## Which Mechanisms Are Only Manually Reachable

The following are primarily CLI/manual or separate workflow surfaces:

- `scientist`, `science`, and general scientist workflows
- `frontier`, `reality`, and `field` grade commands
- `external-production` and `external-reproduction`
- `publication` and explicit corpus publish/autopublish governance commands
- `factory` and `open-invention`
- `release`, `launch`, and `e2e`
- plugin API workflows
- bounded `discovery` outside the daemon loop

## Declared But Not Contract-Tested

The strongest declared-but-not-contract-tested gap was the daemon mechanism
execution path:

- `MechanismRouter` selected tools.
- `MechanismPlan` stored `selectedTools`, `requiredEvidence`, and routing
  expectations.
- No daemon execution artifact proved that each selected tool module ran.
- Downstream proof/mechanism pressure did not consume a mechanism execution
  artifact.

That P1 gap is now covered by new contract tests for:

- HardSeed to `MechanismRouter` to `MechanismPlan`
- `MechanismPlan` to domain-specific module invocation
- cycle-level consumption of mechanism execution artifacts

Remaining declared-but-not-contract-tested or insufficiently integrated areas:

- external production/reproduction as a daemon candidate promotion input
- package scout intake from public corpus packages
- OS closure reconciliation against pre-existing local Fund state
- direct corpus audit of OS package manifests and replay status
- plugin capability lifecycle

## Writers With No Strong Downstream Reader

These mechanisms write artifacts that are useful but weakly consumed by later
mechanisms in the Fund path:

| Writer                                 | Artifact pattern                                       | Current reader reality                                |
| -------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| External production/reproduction       | `.sovryn/external-*`                                   | Manual/readiness path; not daemon selected.           |
| Frontier/reality/field                 | `.sovryn/frontier`, `.sovryn/reality`, `.sovryn/field` | Grading outputs are not candidate promotion blockers. |
| Plugin API                             | plugin registry/config artifacts                       | Extension surface, not daemon path.                   |
| Package scout                          | `.sovryn/discovery-daemon/package-scout.json`          | Exists, but local staged intake is weak.              |
| Standalone scientist/general scientist | scientist artifacts                                    | Not routed through daemon mechanism plans.            |

After the P1 fix, `strategy`, `knowledge`, `route`, `domain pack`, `science`,
`lab`, `formal`, `repo`, `temporal`, `external-review`, and `nobel-readiness`
outputs are attached to `.sovryn/discovery-daemon/mechanism-executions/*.json`
and consumed by cycle proof/mechanism pressure.

## Consumers Expecting Missing Or Weak Upstream Artifacts

| Consumer                    | Expected upstream                                     | Reality                                                                                                  |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Candidate-present preflight | evidence-backed `FundCandidateDraft` with stable refs | Implemented, but local state has an existing Fund and needs reconciliation before edits.                 |
| Fund Gate                   | promoted `FundCandidate` with complete refs           | Implemented; this pass did not change gate logic.                                                        |
| OS closure ledger           | current daemon Fund state                             | Existing local closure accounting is stale relative to pre-existing `FUND_FOUND`.                        |
| Package scout               | strong corpus/public packages for candidate intake    | Cartography showed staged package count 0.                                                               |
| Corpus/public audits        | published package/site artifacts                      | Implemented, but OS route package manifest consumption is indirect rather than a single direct contract. |

The local Fund candidate path also has an identity/path caveat recorded in the
prior cartography: the candidate ID and draft/package path appear truncated in
one local artifact path. This was not changed because it touches existing Fund
state.

## Complete Flows

| Flow                                                                | Status                                            |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| Mission/worktree/runner/verify/review/policy                        | Complete with caveats outside daemon.             |
| Cross-domain target to route/domain pack/evidence package           | Complete with domain caveats.                     |
| OS v1.5/v1.6 package/replay/closure services                        | Complete with stale local Fund accounting caveat. |
| Corpus publish/site audit                                           | Complete as product paths.                        |
| Daemon hard seed to candidate identity to draft/preflight/Fund Gate | Complete as an internal daemon path.              |
| HardSeed to `MechanismRouter` to `MechanismPlan`                    | Verified by new test.                             |
| `MechanismPlan` to selected module invocation                       | Fixed and verified by new test.                   |
| Mechanism execution artifact to cycle pressure                      | Fixed and verified by new test.                   |

## Broken Flows

| Flow                                     | Break                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-fix daemon `MechanismPlan` execution | Selected tools were nominal and not executed by the cycle. Fixed in this pass.                                                                   |
| Local Fund state to OS closure ledger    | Existing daemon artifacts show `FUND_FOUND`, while OS closure accounting remains stale. Deferred as unsafe without explicit reconciliation goal. |
| Local Fund candidate/package identity    | Prior map recorded an apparent candidate ID/path mismatch. Deferred because it touches existing Fund artifacts.                                  |

No P0 code break was found that required changing Fund Gate logic or weakening
science gates.

## Partial Or Caveated Flows

| Flow                                   | Caveat                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Einstein/Nobel readiness               | Internal readiness is not external scientific review.                       |
| Formal/repo/temporal routes            | Implemented but remain bounded and domain-specific.                         |
| Dataset/materials/astro/climate routes | Implemented, but full scientific validation remains externally dependent.   |
| Claim/principle route                  | Claim safety can be invoked, but external review readiness remains limited. |
| Package scout to candidate intake      | Weak local intake evidence.                                                 |
| Corpus to OS package/replay            | Product paths exist but are not a single direct end-to-end corpus contract. |

## Evaluation Decision

The cartography is broadly accurate about the system shape. The highest-priority
concrete wiring gap was that the daemon selected mechanisms without executing
and consuming module-level outputs. That gap has a bounded P1 fix. Remaining
high-risk issues are mostly state reconciliation and external review readiness,
not safe wiring edits under this goal's constraints.
