# Theory Cards

## theory-evaluation-fragility

Benchmark conclusions are fragile when evaluation protocols, splits, metrics, or replay conditions change.

Mechanism: Protocol variables alter class exposure, group overlap, difficulty, and metric summaries before model quality is interpreted.

Confidence: 84

## theory-protocol-sensitivity

Benchmark metrics move when source-described split structure is preserved instead of replaced by convenient random splits.

Mechanism: Source splits encode subject, file, spatial, class, temporal, or contributor structure that random splits can smooth away.

Confidence: 80

## theory-rare-class-metric-illusion

Class imbalance and metric choice can mimic protocol or leakage risk.

Mechanism: Accuracy and weighted metrics can hide rare-class failure while macro-F1 exposes it.

Confidence: 74

## theory-leakage-vs-difficulty-differentiation

Split deltas must be separated into leakage mechanisms, ordinary protocol difficulty, metric artifacts, or ambiguity.

Mechanism: Direct overlap and feature/target checks are required before leakage is accepted.

Confidence: 76

## theory-protocol-ambiguity-barrier

Ambiguous protocol descriptions cap the strength of benchmark claims even when data loading and modeling succeed.

Mechanism: Multiple plausible split interpretations produce materially different evidence boundaries.

Confidence: 78
