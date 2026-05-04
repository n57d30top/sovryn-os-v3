# Scientific Method Core

Sovryn OS `3.1.0-alpha.3` includes the first autonomous
computational-science layer, a deterministic experiment/data/instrument
runtime, and bounded statistical analysis for safe synthetic energy-data
studies.

The core flow is:

1. Create a scientific question.
2. Generate hypotheses with explicit null hypotheses.
3. Design a bounded computational experiment.
4. Generate synthetic data.
5. Build bounded software instruments.
6. Run deterministic experiment seeds through Node Alpha evidence.
7. Analyze confusion metrics and compare against the baseline.
8. Run ablations, sensitivity sweeps, and error analysis.
9. Review the study against scientific-method, runtime, analysis, and safety
   gates.

```bash
sovryn science question "Do provenance-aware anomaly scoring methods reduce false positives in synthetic energy-usage datasets compared with simple threshold baselines?" --json
sovryn science hypothesize <question-id> --json
sovryn science experiment design <hypothesis-id> --json
sovryn science data generate <study-id> --json
sovryn science instrument build <study-id> --json
sovryn science experiment run <experiment-id> --json
sovryn science experiment status <experiment-id> --json
sovryn science analyze <experiment-id> --json
sovryn science compare-baseline <experiment-id> --json
sovryn science ablate <experiment-id> --json
sovryn science sensitivity <experiment-id> --json
sovryn science review <study-id> --json
```

Study artifacts are written under:

```text
.sovryn/science/studies/<study-slug>/
  study.json
  question.json
  hypotheses.json
  experiment-design.json
  data-plan.json
  synthetic-datasets/
  instrument-plan.json
  toolchain-plan.json
  toolchain-policy-review.json
  instruments/
  experiment-runs/
  node-alpha-execution.json
  experiment-status.json
  statistical-analysis.json
  baseline-comparison.json
  ablation-analysis.json
  sensitivity-analysis.json
  error-analysis.json
  safety-scope.json
  SCIENCE_PLAN.md
  STUDY_STATUS.md
  NODE_ALPHA_EXECUTION.md
  STATISTICAL_ANALYSIS.md
  BASELINE_COMPARISON.md
  ABLATION_REPORT.md
  SENSITIVITY_ANALYSIS.md
  ERROR_ANALYSIS.md
  science-review.json
  SCIENCE_REVIEW.md
```

The alpha gates require a question, hypotheses, null hypotheses, experiment
design, baseline, metrics, falsification criteria, and safety scope. They also
block unsupported scientific claims before statistics, replication, and
falsification exist. Runtime gates require generated data, instrument plans,
instrument tests, toolchain policy review, Node Alpha execution evidence,
no-silent-fallback evidence, and deterministic experiment runs. Analysis gates
require statistical analysis, baseline comparison, confusion metrics, ablations,
sensitivity sweeps, error analysis, evidence-bound result labels, and no
unsupported causal claims.

Alpha.3 result labels remain conservative. A study may report a bounded
`partially_supported`, `inconclusive`, `weakened`, or `rejected` analysis label,
but it is not treated as fully supported until later replication and
falsification phases exist.

Hard safety boundaries remain in force:

- no dangerous wet-lab protocols,
- no hazardous chemistry synthesis,
- no biological optimization,
- no exploit development,
- no medical treatment recommendations.

Sovryn scientific studies are limited to safe computational work: public
non-sensitive data, synthetic data, simulations, statistics, benchmarks, and
software instruments. Sovryn does not file patents and does not provide legal
novelty, patentability, or freedom-to-operate opinions.
