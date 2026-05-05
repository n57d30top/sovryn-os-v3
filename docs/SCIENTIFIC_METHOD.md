# Scientific Method Core

Sovryn OS `3.3.0-rc.1` includes the first autonomous
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
3.2 Alpha.1 adds safe real-data ingestion for computational science: dataset
search, deterministic fixture/cache ingestion, provenance, validation, replay,
study binding, and real-vs-synthetic comparison with conservative limitations.
3.2 Alpha.2 adds scientific reproduction planning and execution for safe
external or internal computational claims, including source-claim extraction,
method/data/metric requirements, bounded reproduction runs, analysis labels,
reports, and limitations. 3.2 Alpha.3 adds autonomous scientific peer review,
corpus-level review, author response, and revision planning so studies can be
critiqued for missing baselines, weak statistics, insufficient replication,
insufficient falsification, unsafe scope, overclaims, and public readability
before showcase-science promotion.
3.2 Alpha.4 adds scientific meta-analysis and learning across study memory:
cross-study effect summaries, contradiction detection, failed-hypothesis
lessons, synthetic-only limitation marking, memory synthesis, next-study plans,
and four-week research-program proposals.
3.3 RC.1 hardens this into a longer autonomous computational-science operating
mode: public studies can be promoted to showcase-science only after non-zero
scores, evaluated falsification, peer review, statistical interpretation, and
showcase documentation; real-data study templates bind safe public/proxy data;
external reproduction challenges can be searched and published; revision reports
can be published; stable findings can be reported; and the seven-day trial
records six studies, reproduction attempts, revision loops, Node Alpha evidence,
container-netoff evidence, meta-analysis, and corpus-publication gates.

The core flow is:

1. Create a scientific question.
2. Generate hypotheses with explicit null hypotheses.
3. Design a bounded computational experiment.
4. Generate synthetic data.
5. Optionally search, ingest, validate, and replay public safe datasets.
6. Bind real/proxy data to the study and compare it against synthetic controls.
7. Build bounded software instruments.
8. Run deterministic experiment seeds through Node Alpha evidence.
9. Analyze confusion metrics and compare against the baseline.
10. Run ablations, sensitivity sweeps, and error analysis.
11. Replicate the experiment across deterministic seeds.
12. Generate negative tests and attempt falsification.
13. Update hypothesis status.
14. Ground the study in source-card summaries.
15. Generate next scientific questions from limitations and falsification.
16. Update scientific memory ledgers.
17. Review the study against scientific-method, runtime, analysis,
    replication, falsification, memory, literature-grounding, and safety gates.
18. Optionally run a science campaign that selects safe questions, completes
    studies, writes paper-style reports, and prepares curated public packages.
19. Publish completed studies into the public corpus as
    `computational_science_study` results after publication gates pass.
20. Optionally reproduce a safe external or internal computational claim and
    report whether it was reproduced, partially reproduced, not reproduced, or
    inconclusive.
21. Run automated scientific peer review, corpus peer review, author response,
    and revision planning before showcase-science use.
22. Run meta-analysis across scientific memory to identify stable findings,
    contradictions, failed hypotheses, and the next research program.
23. Harden public studies into showcase-science only after peer review,
    evaluated falsification, non-zero scores, and public documentation.
24. Search and publish bounded external reproduction reports.
25. Publish revision evidence and stable-finding reports.
26. Run a bounded seven-day autonomous computational scientist trial.

```bash
sovryn science question "Do provenance-aware anomaly scoring methods reduce false positives in synthetic energy-usage datasets compared with simple threshold baselines?" --json
sovryn science hypothesize <question-id> --json
sovryn science experiment design <hypothesis-id> --json
sovryn science data generate <study-id> --json
sovryn science data search "energy weather anomaly public dataset" --json
sovryn science data ingest public-weather-energy-proxy-v1 --study-id <study-id> --json
sovryn science data validate public-weather-energy-proxy-v1 --json
sovryn science data provenance public-weather-energy-proxy-v1 --json
sovryn science data cache status --json
sovryn science data replay public-weather-energy-proxy-v1 --json
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
sovryn science study run-real-data energy-anomaly --json
sovryn science reproduce search "data quality anomaly detection reproducibility" --json
sovryn science reproduce plan "safe public energy anomaly detection claim" --json
sovryn science reproduce run <reproduction-id> --json
sovryn science reproduce analyze <reproduction-id> --json
sovryn science reproduce report <reproduction-id> --json
sovryn science reproduce publish <reproduction-id> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science peer-review <study-id> --json
sovryn science peer-review-corpus --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science rebuttal <study-id> --json
sovryn science revise <study-id> --json
sovryn science revision publish <study-id> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science meta-analysis run --json
sovryn science memory synthesize --json
sovryn science contradictions find --json
sovryn science stable-findings report --json
sovryn science research-program propose --json
sovryn science next-study plan --json
sovryn science trial run --goal "Perform safe autonomous computational science" --days 7 --studies 6 --real-data-preferred --autopublish-corpus --json
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
  real-data-plan.json
  real-datasets/
  real-data-validation.json
  real-vs-synthetic-comparison.json
  DATA_PROVENANCE.md
  REAL_DATA_LIMITATIONS.md
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
  peer-review.json
  author-response.json
  revision-plan.json
  revised-study.json
  REVISED_REPORT.md
  SHOWCASE.md
  METHOD.md
  REPRODUCE.md
  EXAMPLES.md
  PEER_REVIEW.md
  STATISTICAL_INTERPRETATION.md
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
  PEER_REVIEW.md
  AUTHOR_RESPONSE.md
  REVISION_PLAN.md
  science-review.json
  SCIENCE_REVIEW.md
```

Peer-review aggregate artifacts are written under:

```text
.sovryn/science/reviews/
  peer-review-report.json
  PEER_REVIEW_REPORT.md
  peer-review-corpus.json
  PEER_REVIEW_CORPUS.md
  review-ledger.json
```

Meta-analysis and scientific-learning artifacts are written under:

```text
.sovryn/science/meta/
  meta-analysis.json
  META_ANALYSIS.md
  cross-study-effect-summary.json
  CROSS_STUDY_EFFECT_SUMMARY.md
  contradictions.json
  CONTRADICTIONS.md
  stable-findings.json
  failed-hypotheses.json
  next-research-program.json
  NEXT_RESEARCH_PROGRAM.md
  memory-synthesis.json
  SCIENTIFIC_LEARNING_REPORT.md
  next-study-plan.json
  NEXT_STUDY_PLAN.md
```

Reproduction artifacts are written under:

```text
.sovryn/science/reproductions/<reproduction-slug>/
  reproduction-plan.json
  source-claim-extraction.json
  method-extraction.json
  data-requirements.json
  metric-requirements.json
  reproduction-run.json
  reproduction-analysis.json
  REPRODUCTION_REPORT.md
  REPRODUCTION_LIMITATIONS.md
```

Real-data registry artifacts are written under:

```text
.sovryn/science/data/
  dataset-registry.json
  dataset-search.json
  dataset-provenance.json
  dataset-validation.json
  dataset-cache-status.json
  dataset-replay.json
  DATASET_REGISTRY.md
  dataset-cache/
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
3.2 Alpha.1 real-data gates require a public-safe dataset plan, provenance,
validation, replayable cache evidence, declared limitations, no private data,
no unsafe data domain, and real-vs-synthetic comparison. Deterministic proxy
datasets are labeled as such and do not support broad real-world performance
claims.
3.2 Alpha.2 reproduction gates require a source claim, method extraction, data
requirements, metric requirements, reproduction plan, run, analysis,
limitations, no unsafe reproduction scope, and no overclaimed reproduction
label.
3.2 Alpha.3 peer-review gates require automated methodological review, a review
label, unsupported-claim review, method-weakness recording, author response,
revision planning when needed, and accept/minor-revision before
showcase-science promotion.
3.2 Alpha.4 meta-analysis gates require a meta-analysis artifact, cross-study
effect summary, contradiction recording, failed-hypothesis recording, next
research program, no overgeneralized meta-claims, and explicit marking of
synthetic-only findings as tentative or requiring real-data validation.

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
