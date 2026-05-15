# Prior Art And Differentiation

| Prior-art principle | Already known | Candidate differentiation | Not claimed |
| --- | --- | --- | --- |
| public benchmark task receipts | Benchmark comparisons should bind task definitions, data access, flows, and evaluation protocols. | The candidate binds every survivor to concrete OpenML task/data receipts and public raw replay. | OpenML methodology supports inspectable benchmarking; it is not an external review of this candidate. |
| reusable experiment records | Machine-learning experiments gain value when datasets, tasks, runs, and evaluations are shared and reusable. | The review package turns internal survivor evidence into a receipt-bound reproduction target. | The paper motivates reproducibility infrastructure, not the novelty of this specific triage rule. |
| holdout and split validation | Generalization estimates depend on held-out data and the split protocol used to evaluate a model. | The candidate explicitly compares random split behavior with a deterministic first-feature holdout probe. | The first-feature holdout is a protocol-fragility probe, not an official split for every task. |
| group-aware validation | Group-aware splits prevent the same group from appearing in both train and test folds. | The receipt-first lineage requires explicit group/time/entity or deterministic split manifests before promotion. | Current survivor tasks use a deterministic feature-bucket holdout rather than verified semantic groups. |
| leakage and protocol failure | Evaluation artifacts can inflate apparent performance when information leaks across the modeling process. | The candidate's negative controls and rival checks target leakage-like and source-family-only explanations. | The current package does not prove leakage; it identifies bounded protocol-fragility survivors. |
| ML reproducibility and leakage review | Leakage and weak validation protocols can create apparently strong results that do not reproduce. | The candidate avoids notifying on replay success alone and keeps external-review caveats explicit. | This source supports the risk model; it does not validate the candidate's survivor set. |
| distribution shift and holdout interpretation | Train/test distribution changes can alter measured model performance and must be treated explicitly. | Random-vs-holdout deltas are reported as bounded protocol-fragility evidence rather than broad model quality. | The package does not identify a causal dataset-shift mechanism for every survivor. |

## Differentiation Summary

The candidate does not claim to invent cross-validation, group splits, leakage detection, OpenML task receipts, or dataset-shift analysis. Its narrower proposed value is combining those expectations into a receipt-first survivor gate that blocks source-family-only benchmark claims and exposes a bounded multi-task survivor set for external review.
