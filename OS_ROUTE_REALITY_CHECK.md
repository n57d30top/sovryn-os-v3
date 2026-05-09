# OS Route Reality Check

## Chain

`Target -> Route -> Domain Pack -> Evidence Package -> Package Manifest -> Replay -> Corpus -> Audit`

Primary implementation areas:

- `src/core/route/cross-domain-evidence-routing-service.ts`
- `src/core/os/os-v15-hardening-service.ts`
- `src/core/os/os-v16-capability-service.ts`
- `src/core/corpus/**`
- domain pack tests under `tests/**`

## Class Status

| Class                           | Route | Domain pack | Evidence package | Package manifest | Replay | Corpus                      | Audit | Status                                |
| ------------------------------- | ----- | ----------- | ---------------- | ---------------- | ------ | --------------------------- | ----- | ------------------------------------- |
| `claim_review`                  | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | complete with caveats                 |
| `tool_usefulness`               | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | complete with caveats                 |
| `dataset_audit`                 | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | complete with caveats                 |
| `benchmark_protocol_audit`      | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | complete with caveats                 |
| `scientific_public_data_triage` | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | complete with caveats                 |
| `repo_package_reproduction`     | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | caveated by repo reproducibility      |
| `formal_counterexample`         | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | caveated by proof/refutation limits   |
| `temporal_evaluation`           | yes   | yes         | yes              | yes              | yes    | via publication/corpus path | yes   | caveated by temporal fragility limits |

## Complete Parts

- Route classification exists for all listed classes.
- Domain pack execution exists for all listed classes.
- Package and replay artifacts exist in the OS hardening path.
- Corpus publish and site audits exist as product commands.

## Broken Parts

No P0 route-to-package break was found.

## Partial Or Caveated Parts

| Area                          | Caveat                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Corpus coupling               | Corpus audits validate public corpus/site surfaces, while OS route package/replay validation is a separate path. |
| Repo package reproduction     | Stronger than a placeholder, but still bounded by fixture/runtime reproducibility.                               |
| Formal counterexample         | Proof/refutation route is bounded and cannot guarantee full formal completeness.                                 |
| Temporal evaluation           | Temporal fragility route is bounded by available temporal artifacts and replay windows.                          |
| Scientific public data triage | Public-data evidence can be packaged, but external significance/review is not guaranteed.                        |

## Wiring Decision

No P0/P1 OS route fix was safe or necessary under this goal. A future P2 fix
could add a direct corpus manifest verification contract for OS route packages,
but that is not required to fix the daemon/Fund nominal-selection gap.
