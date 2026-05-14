# Next Discovery Strategy

Recommendation: pivot the active discovery search to benchmark leakage / ML evaluation fragility.

Do not continue autonomous formal source-object mining unchanged. Keep it as a benchmark/evaluation suite and as a secondary path for human-curated claims only.

## Rationale

Benchmark/data fragility has better near-term yield because it can produce:

- measurable target outcomes before candidate birth,
- frozen protocol perturbation predictions,
- multiple simple baselines,
- same-dataset negative controls,
- independent task/dataset holdouts,
- replayable scripts using public data,
- externally inspectable tables rather than internal manifest-only evidence.

## First Concrete Experiment

Run a small, claim-first benchmark protocol fragility pilot:

1. Select 8-12 public OpenML/sklearn-compatible tasks with concrete dataset IDs and source receipts.
2. Freeze one protocol-mechanism claim per task before execution: split leakage, group leakage, target encoding leakage, metric sensitivity, or train/test contamination.
3. Run baseline model families plus shuffled-label, metadata-ablation, group-holdout, and split-perturbation controls.
4. Create HardSeeds only when a predeclared protocol mechanism predicts outcome deltas beyond simple baselines and survives controls.
5. Create InsightCandidates only if recurrence appears across independent tasks or source families.

Expected terminal if no candidate survives: continue_searching with death causes. No Fund state unless a discovery-scored candidate passes full gates.
