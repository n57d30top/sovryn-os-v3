# Scientific Method Core

Sovryn OS `3.1.0-rc.2` includes the first autonomous
computational-science layer, a deterministic experiment/data/instrument
runtime, bounded statistical analysis, replication, and falsification for safe
synthetic energy-data studies. Alpha.5 adds scientific memory, fixture-backed
literature grounding, source cards, and follow-up question generation. v1.1
RC.1 adds a deterministic science-campaign runner that completes two safe
hypothesis-driven studies, writes paper-style reports, updates scientific
memory, and prepares curated local public corpus packages. v1.1 RC.2 adds
public science-study publication into the configured corpus repository with
public hypotheses, statistics, replication, falsification, scientific-memory
updates, INDEX/API updates, and public-hygiene audit gates.

The core flow is:

1. Create a scientific question.
2. Generate hypotheses with explicit null hypotheses.
3. Design a bounded computational experiment.
4. Generate synthetic data.
5. Build bounded software instruments.
6. Run deterministic experiment seeds through Node Alpha evidence.
7. Analyze confusion metrics and compare against the baseline.
8. Run ablations, sensitivity sweeps, and error analysis.
9. Replicate the experiment across deterministic seeds.
10. Generate negative tests and attempt falsification.
11. Update hypothesis status.
12. Ground the study in source-card summaries.
13. Generate next scientific questions from limitations and falsification.
14. Update scientific memory ledgers.
15. Review the study against scientific-method, runtime, analysis,
    replication, falsification, memory, literature-grounding, and safety gates.
16. Optionally run a science campaign that selects safe questions, completes
    studies, writes paper-style reports, and prepares curated public packages.
17. Publish completed studies into the public corpus as
    `computational_science_study` results after publication gates pass.

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
sovryn science replicate <experiment-id> --runs 3 --json
sovryn science negative-tests <study-id> --json
sovryn science falsify <hypothesis-id> --json
sovryn science hypothesis status <hypothesis-id> --json
sovryn science literature ground <study-id> --json
sovryn science next-questions <study-id> --json
sovryn science memory update <study-id> --json
sovryn science memory search "energy anomaly provenance" --json
sovryn science memory report --json
sovryn science campaign run --goal "Run safe computational science studies" --studies 2 --autopublish-corpus --json
sovryn science publish <study-id> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science publish-all --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
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
  replication-runs/
  replication-summary.json
  negative-tests.json
  falsification-report.json
  hypothesis-status.json
  source-cards/
  literature-grounding.json
  source-summary.json
  next-questions.json
  memory-update.json
  safety-scope.json
  SCIENCE_PLAN.md
  STUDY_STATUS.md
  NODE_ALPHA_EXECUTION.md
  STATISTICAL_ANALYSIS.md
  BASELINE_COMPARISON.md
  ABLATION_REPORT.md
  SENSITIVITY_ANALYSIS.md
  ERROR_ANALYSIS.md
  REPLICATION.md
  NEGATIVE_TESTS.md
  FALSIFICATION.md
  HYPOTHESIS_STATUS.md
  LITERATURE_GROUNDING.md
  NEXT_QUESTIONS.md
  science-review.json
  SCIENCE_REVIEW.md
```

Campaign artifacts are written under:

```text
.sovryn/science/campaigns/<campaign-slug>/
  campaign-run.json
  candidate-questions.json
  selected-studies.json
  SCIENCE_CAMPAIGN_REPORT.md
  PUBLICATION_SUMMARY.md
  public-corpus/
    results/<study-slug>/
      README.md
      SCIENTIFIC_REPORT.md
      PAPER.md
      HYPOTHESES.md
      EXPERIMENT_DESIGN.md
      DATASET.md
      INSTRUMENTS.md
      STATISTICAL_ANALYSIS.md
      BASELINE_COMPARISON.md
      ABLATION_REPORT.md
      SENSITIVITY_ANALYSIS.md
      REPLICATION.md
      FALSIFICATION.md
      SCIENTIFIC_MEMORY_UPDATE.md
      LIMITATIONS.md
      SUMMARY.json
      AUTOPUBLISH_RECORD.json
      release/
      evidence/public/
```

Scientific memory is stored separately so later studies can search and reuse
bounded lessons:

```text
.sovryn/science/memory/
  hypothesis-ledger.json
  study-ledger.json
  instrument-ledger.json
  dataset-ledger.json
  result-map.json
  open-questions.json
  rejected-hypotheses.json
  supported-hypotheses.json
  memory-report.json
  SCIENTIFIC_MEMORY.md
  OPEN_QUESTIONS.md
```

The alpha gates require a question, hypotheses, null hypotheses, experiment
design, baseline, metrics, falsification criteria, and safety scope. They also
block unsupported scientific claims before statistics, replication, and
falsification exist. Runtime gates require generated data, instrument plans,
instrument tests, toolchain policy review, Node Alpha execution evidence,
no-silent-fallback evidence, and deterministic experiment runs. Analysis gates
require statistical analysis, baseline comparison, confusion metrics, ablations,
sensitivity sweeps, error analysis, evidence-bound result labels, and no
unsupported causal claims. Replication/falsification gates require at least
three replication runs, explicit stability recording, safe negative tests,
falsification evidence, hypothesis status, documented failure cases, and no
unsupported publication of results. Alpha.5 memory gates require scientific
memory updates, hypothesis/study/dataset/instrument ledgers,
literature-grounding evidence, at least three study-bound source cards, next
questions, rejected-hypothesis tracking, and no unsupported literature claims.
RC.1 campaign gates require candidate questions, two completed safe studies,
hypotheses with null hypotheses, experiment designs, datasets, instruments,
Node Alpha execution, statistics, baselines, ablations, replication,
falsification, memory updates, paper reports, public hygiene, safety scope, and
curated corpus package preparation. RC.2 science-publication gates additionally
require public reports for hypotheses, null hypotheses, statistics,
replication, falsification, and scientific-memory updates; they update
`INDEX.json`, `aggregate/science-studies.json`,
`aggregate/scientific-memory-summary.json`,
`public-corpus/api/science-studies.json`, and `public-corpus/science.html`.

Alpha.5 can mark a hypothesis `supported` only within the bounded synthetic
study when replication is stable and falsification has no material failures.
Otherwise the status remains `partially_supported`, `inconclusive`, `weakened`,
or `rejected`.

RC.1 campaigns still use deterministic fixture-backed studies for CI
reproducibility. `--autopublish-corpus` prepares curated local science-result
packages; it does not create new GitHub repositories or push by itself.

Literature grounding in the deterministic alpha test path uses fixture-backed
source-card summaries. Query links and adapter failures do not count as reviewed
source cards. Real-source grounding must bind concrete public source cards to
specific claims or limitations before making stronger claims.

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
