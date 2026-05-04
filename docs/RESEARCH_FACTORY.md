# Autonomous Open Research Factory

The Autonomous Open Research Factory turns a broad research goal into an
auditable Open Invention research cycle:

```bash
sovryn factory run "Develop open-source methods for self-verifying autonomous research agents" --json
sovryn factory status <factory-id> --json
sovryn factory improve <factory-id> --max-cycles 2 --json
sovryn factory replay <factory-id> --json
sovryn factory review <factory-id> --json
sovryn factory package <factory-id> --json
```

The MVP is deterministic and does not require an LLM API. It reuses the existing
Open Invention, public-source search, source-reading, prototype, verification,
and publication-gate architecture.

## Outputs

Factory runs write:

```text
.sovryn/factory/<factory-slug>/
  factory-run.json
  research-plan.json
  question-map.json
  source-discovery.json
  source-readings.json
  source-cards.json
  feature-matrix.json
  claim-feature-matrix.json
  counter-evidence.json
  novelty-gap-map.json
  experiment-plan.json
  benchmark-plan.json
  candidate-inventions.json
  selected-candidates.json
  factory-score.json
  FACTORY_REPORT.md
  LIMITATIONS.md
  CLAIM_FEATURE_MATRIX.md
  COUNTER_EVIDENCE.md
  EXPERIMENT_PLAN.md
  BENCHMARK_PLAN.md
  REPLAY_REPORT.md
  release/public/
```

For each selected candidate, the factory also creates a normal Open Invention
mission under `.sovryn/inventions/<slug>/` with dossier files, prototype,
tests, evidence, safety review, license, and release staging.

## Gates

Factory review checks:

- `FACTORY_PLAN_COMPLETE`
- `SOURCE_DISCOVERY_PRESENT`
- `CONCRETE_OR_DECLARED_MOCK_SOURCES`
- `SOURCE_READINGS_BOUND`
- `FEATURE_MATRIX_COMPLETE`
- `NOVELTY_GAP_MAP_COMPLETE`
- `CANDIDATES_GENERATED`
- `SELECTED_CANDIDATE_PRESENT`
- `INVENTION_MISSION_CREATED`
- `PROTOTYPE_PRESENT`
- `TESTS_PRESENT`
- `SAFETY_REVIEW_PRESENT`
- `LIMITATIONS_PRESENT`
- `PUBLIC_EVIDENCE_PACKAGED`
- `NO_SECRET_LEAKS`
- `NO_RAW_COMMAND_LOGS_IN_PUBLIC_RELEASE`
- `HASHES_BOUND_TO_EVIDENCE`
- `FINAL_FACTORY_VERIFY_FRESH`
- `SOURCE_READING_DEPTH_RECORDED`
- `SOURCE_CARD_INDEX_HASH_VALID`
- `CLAIM_FEATURE_MATRIX_V3_PRESENT`
- `COUNTER_EVIDENCE_PRESENT`
- `EXPERIMENT_PLAN_PRESENT`
- `FACTORY_REPLAY_PASSES`
- `PUBLIC_RELEASE_V3_CURATED_ONLY`
- `NO_FULL_RAW_SOURCE_IN_PUBLIC_RELEASE`

Weak evidence does not become stronger by being generated. Query links, adapter
failures, and mock placeholders are not reviewed prior art. Strict mode can
require concrete sources by setting:

```json
{
  "research": {
    "factory": {
      "requireConcreteSources": true,
      "allowMockMode": false
    }
  }
}
```

## Public Evidence

`sovryn factory package <factory-id>` creates only curated public summaries:

```text
factory-run.summary.json
source-discovery.summary.json
source-readings.summary.json
feature-matrix.summary.json
novelty-gap-map.summary.json
candidate-inventions.summary.json
selected-candidates.summary.json
factory-score.summary.json
counter-evidence.summary.json
experiment-plan.summary.json
benchmark-plan.summary.json
replay-report.summary.json
FACTORY_REPORT.md
LIMITATIONS.md
CLAIM_FEATURE_MATRIX.md
COUNTER_EVIDENCE.md
EXPERIMENT_PLAN.md
BENCHMARK_PLAN.md
REPLAY_REPORT.md
```

Raw stdout/stderr logs, local command journals, secrets, tokens, and full raw
source content are not copied into the public factory release.

## Alpha.14 Research Intelligence

Alpha.14 upgrades the factory from strict evidence gating to deeper research
intelligence. Source readings record bounded depth, Source Cards v2 summarize
concrete sources, Claim/Feature Matrix v3 separates known overlap from possible
differentiators, counter-evidence records why a candidate may not be novel, and
experiment/benchmark plans state what still needs validation. Replay recomputes
score and gates from existing evidence without network calls.

`container-local` is available through:

```bash
sovryn worker doctor --profile container-local --json
sovryn node run alpha <mission-id> --mode validate --profile container-local --json
```

It uses Docker or Podman if available and reports unavailable without silently
falling back to host execution. It is not a substitute for a hardened VM.

## Scope

This is an open-source research artifact and defensive-publication workflow. It
is not a legal patent filing, not a patentability opinion, and not a
freedom-to-operate opinion. Serious uses still need human review.
