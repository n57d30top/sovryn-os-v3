# Research Factory Demo

This demo uses fixture-backed real-evidence mode so it works without network
access. The fixtures include concrete GitHub and paper sources, patent and
standards query links, and one adapter failure. Query links and failures stay
visible, but they do not count as reviewed prior art.

From a fresh repo or temp directory, initialize Sovryn and copy the config shape
from `config.fixture.json` into `.sovryn/config.json`, then run:

```bash
npm install
npm test
npm run build
node dist/cli.js init
node dist/cli.js factory run "Develop a method for verifiable autonomous open-source research agents" --mode autonomous --max-cycles 3 --json
node dist/cli.js factory status <factory-id> --json
node dist/cli.js factory improve <factory-id> --max-cycles 1 --json
node dist/cli.js factory replay <factory-id> --json
node dist/cli.js factory review <factory-id> --json
node dist/cli.js factory package <factory-id> --json
node dist/cli.js factory publish-github <factory-id> --dry-run --json
node dist/cli.js worker doctor --profile container-local --json
```

The demo creates `.sovryn/factory/<slug>/` and at least one generated Open
Invention mission under `.sovryn/inventions/<slug>/`.

Expected public evidence includes:

```text
release/public/
  FACTORY_REPORT.md
  LIMITATIONS.md
  CLAIM_FEATURE_MATRIX.md
  COUNTER_EVIDENCE.md
  EXPERIMENT_PLAN.md
  BENCHMARK_PLAN.md
  NOVELTY_GAP_REPORT.md
  REPLAY_REPORT.md
  candidate-selection-rationale.md
  factory-run.summary.json
  source-discovery.summary.json
  source-readings.summary.json
  source-cards.summary.json
  source-cards.index.summary.json
  claim-feature-matrix.summary.json
  counter-evidence.summary.json
  novelty-gap-map.summary.json
  experiment-plan.summary.json
  benchmark-plan.summary.json
  candidate-inventions.summary.json
  selected-candidates.summary.json
  factory-score.summary.json
  replay-report.summary.json
  prototype-execution.summary.json
```

Alpha.14 adds Source Cards v2, Claim/Feature Matrix v3, counter-evidence,
experiment/benchmark plans, deterministic improvement cycles, replay evidence,
and the `container-local` worker doctor. Fixture mode can reach moderate or
strong readiness because the concrete source/read evidence is explicit and
hash-bound; query links, adapter failures, and mock placeholders still do not
count as reviewed prior art.

See `generated-public/` for abbreviated example public artifacts. The report
states that this is an open-source research artifact and defensive-publication
workflow, not a legal patent filing, patentability opinion, novelty opinion, or
freedom-to-operate opinion.
