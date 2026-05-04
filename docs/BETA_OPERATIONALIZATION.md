# Beta Operationalization

Sovryn OS v3 `3.0.0-beta.22` adds an operational proof layer above the Alpha
Factory. The goal is to show that Sovryn can run bounded autonomous research
workflows, measure quality, keep publication governed, execute worker jobs
without silent fallback, export a public corpus, and produce three
human-reviewable pilot Open Invention release candidates. Beta.11 adds a safe
external research proof run for a chemistry-style molecular-record auditor that
builds a custom tool, provisions `pint` under policy, validates through Node
Alpha, and feeds the existing corpus autopublish path. Beta.12 adds the
versioned v2 flow, where package provisioning and final `container-netoff`
validation are separated and worker-assurance evidence is written before corpus
autopublish eligibility is granted. Beta.13 adds a second external-domain proof
with `energy-record-auditor`, a synthetic anonymized energy-data anomaly
auditor that provisions `pandas`, detects duplicate timestamps, missing
intervals, high-usage spikes, weather-normalized anomalies, and weak provenance,
and stays outside private smart-meter, surveillance, and energy-market trading
use cases.
Beta.14 adds a bounded multi-domain campaign that joins chemistry-style data
quality, synthetic energy anomaly detection, and defensive software patch-risk
auditing. The new `patch-risk-auditor` uses synthetic toy patches and
policy-provisioned parser evidence only; it does not operate against real
systems, generate harmful code, or publish unsafe payloads. Beta.15 adds
anti-template quality gates and corpus quality audit reports so generic,
repetitive, shallow, or weakly grounded results are rejected or marked for
revision.
Beta.16 adds the public corpus product layer: the existing
`sovryn-open-inventions` repo can be built into a static `public-corpus/` site
with result pages, JSON API exports, badges, status/domain summaries, graph
metadata, and a site audit that blocks public leaks before push.
Beta.17 adds the bounded overnight external trial and v1-RC gate path. Operators
can run a safe external-domain trial with corpus autopublish enabled, then run
`sovryn launch v1-rc-check --json` to verify replay, security, public hygiene,
corpus-site, custom-tool, and Node Alpha execution gates.
Beta.18 adds corpus lifecycle curation on top of that proof: the public corpus
keeps every old result folder, but `corpus site build` now groups versions,
maps superseded entries, selects showcase results, records revision queues, and
exports lifecycle fields in `INDEX.json`, the public API, and the static site.
Beta.19 adds the real-source external research campaign. It runs safe
energy-data-quality, software-supply-chain-assurance, and scientific dataset
reliability domains with public-source search enabled, writes
`real-source-search.json`, real-source-bound source cards, claim/feature
matrices, counter-evidence, experiment plans, benchmark plans, and pilot
bindings, then allows corpus autopublish only when concrete-source thresholds
are met.
Beta.20 upgrades the public showcase layer. `corpus site build` now rewrites
the selected showcase result READMEs for humans and writes `SHOWCASE.md`,
`METHOD.md`, `REPRODUCE.md`, `LIMITATIONS.md`, and `EXAMPLES.md` for each
showcase result. Showcase selection requires good or excellent quality,
specificity at or above 75, anti-template status `review_ready` or better,
reproducibility at or above 90, publication safety at or above 90, replay
critical pass rate 100, and public-hygiene-clean output.

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not file legal patents and does not provide legal
novelty, patentability, or freedom-to-operate opinions.

## Real Autonomy Validation

```bash
sovryn autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
sovryn autonomy campaign run --json
sovryn autonomy campaign report --json
sovryn autonomy scorecard --json
```

Artifacts:

```text
.sovryn/autonomy/
  campaign-plan.json
  campaign-run.json
  campaign-events.jsonl
  campaign-results.json
  autonomy-scorecard.json
  AUTONOMY_SCORECARD.md
  AUTONOMY_REPORT.md
```

The campaign records planned sessions, executed Factory runs, blocked/deferred
runs, replay state, release-candidate count, corpus entries, and a readiness
label. It explicitly records `noRealPublication: true`.

## Publication Governance

```bash
sovryn publication queue --json
sovryn publication review <candidate-id> --json
sovryn publication approve <candidate-id> --json
sovryn publication publish <candidate-id> --dry-run --json
sovryn publication publish <candidate-id> --real --json
sovryn publication audit <candidate-id> --json
```

Real publication is disabled by default:

```json
{
  "publication": {
    "allowAutonomousPublish": false,
    "requireHumanApproval": true,
    "minimumQualityLabel": "excellent",
    "requireSecurityAudit": true,
    "requireReliabilityReplay": true,
    "requireNoPublicLeaks": true,
    "maxReposPerDay": 3,
    "allowedOrg": "sovryn-open-inventions"
  }
}
```

Dry-run publication writes intent and ledger evidence. Real publication requires
strict policy, approval evidence, and existing Sovryn publication gates.

## Public Corpus Product Layer

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus explain-result chemistry-record-auditor-tool-v2 --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

The product layer is generated from curated `results/<slug>/` summaries and
autopublish records only. It does not publish raw internal `.sovryn` state, raw
worker output, command journals, local absolute paths, secrets, private config,
or full raw source dumps. It gives readers a human-facing entry point into the
corpus while preserving machine-readable JSON for search, quality, result
status, and graph traversal.

## Real-Source External Campaign

```bash
sovryn external-research campaign real-sources --domains 3 --json
sovryn external-research campaign real-sources --domains 3 --fixture-sources --json
```

The non-fixture command uses the public-source adapter/cache path and records
adapter health, source-kind counts, query links, adapter failures, and concrete
source-card counts. The fixture command is deterministic for CI and simulates
concrete adapter results without requiring network.

Real-source campaign gates include:

- `REAL_SOURCE_SEARCH_ENABLED`
- `CONCRETE_SOURCES_PRESENT`
- `SOURCE_CARDS_REAL_SOURCE_BOUND`
- `FIXTURE_FALLBACK_DECLARED`
- `QUERY_LINKS_NOT_COUNTED_AS_REVIEWED`
- `REAL_SOURCE_REPLAY_CACHE_PRESENT`
- `AUTOPUBLISH_ONLY_IF_REAL_SOURCE_THRESHOLD_MET`

Query links, adapter failures, mock placeholders, and declared
`fixture_fallback` records are never counted as reviewed prior art. If fallback
is needed because concrete source adapters fail, the domain is degraded and
corpus autopublish is blocked unless a later run produces enough concrete
source-card evidence.

## Overnight External Trial and v1-RC Gate

```bash
sovryn overnight run \
  --goal "Generate safe external open inventions" \
  --max-runs 3 \
  --autopublish-corpus \
  --json
sovryn launch v1-rc-check --json
```

The Beta.17 trial coordinates safe external domains, custom research tools,
policy-provisioned package evidence, Node Alpha execution, worker
no-silent-fallback evidence, quality and safety summaries, optional corpus
autopublish, a morning brief, and a v1-RC gate report. It does not create
standalone GitHub repositories, does not run dangerous goals, and does not
publish raw logs or private local state.

## Persistent Worker Jobs

```bash
sovryn worker register alpha --json
sovryn worker heartbeat --json
sovryn worker jobs list --json
sovryn worker jobs run <job-id> --profile container-netoff --json
sovryn worker jobs cleanup <job-id> --json
```

Worker jobs are opt-in and evidence-bound. `container-netoff` never silently
falls back to host execution. If Docker or Podman is unavailable, Sovryn writes
degraded/unavailable evidence instead of running on the host.

## Research Benchmarks

```bash
sovryn benchmark research run --json
sovryn benchmark quality calibrate --json
sovryn benchmark compare-baseline --json
```

The benchmark suite contains curated tasks for evidence chains, source-card
trust scoring, counter-evidence, toolchain policy, worker execution, release
leakage detection, and launch packaging. Benchmarks calibrate research quality;
they do not imply legal novelty.

## Public Corpus API

```bash
sovryn corpus api export --json
sovryn corpus badges build --json
sovryn corpus serve --port 7331 --json
sovryn corpus release-notes build --json
```

The API export writes `public-corpus/api/` with curated JSON only. It excludes
raw logs, secrets, private config, local absolute paths, unredacted command
journals, and full raw source dumps.

## Launch And Pilot

```bash
sovryn launch check --json
sovryn launch demo --json
sovryn launch package --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
```

Launch checks aggregate beta, audit, reliability, public corpus, and no-leak
signals. Pilot runs create end-to-end evidence for the built-in evidence-chain,
toolchain-policy, and corpus-deduplication scenarios while keeping real
publication disabled unless a later operator explicitly approves a strict gated
publish.

Pilot artifacts are written under `.sovryn/pilots/`, including per-pilot
Factory/Open Invention bindings, quality evaluations, security audits,
reliability replays, publication dry-run intents, corpus entries, and human
review checklists.

## Beta.9 E2E Validation

```bash
sovryn e2e doctor --json
sovryn e2e run --profile beta-fixture --release-candidates 3 --json
sovryn e2e report --json
```

The E2E harness creates a fresh temporary Git repository and invokes the built
`dist/cli.js`. It validates init, beta demo/check/package, autonomy campaign,
Factory/Open-Invention packaging, worker validation, benchmarks, publication
dry-run governance, audits, corpus export, launch, and pilot evidence.

Artifacts are written under `.sovryn/e2e/`. Beta.8 added
`replay-contract.json`, `replay-diagnostics.json`, and
`launch-limitations.json` so the scorecard can distinguish replay-critical
evidence from volatile observations and blocking launch limitations from
accepted beta notes. Beta.9 adds multi-candidate validation for three pilot
release candidates. The harness is fixture-backed and deterministic by default.
It never performs real GitHub publication.

## Beta.21 Falsification Evaluation

```bash
sovryn evaluate falsify <result-slug> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn evaluate falsify-all --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

Falsification is an independent public-corpus review pass. It creates
per-result `FALSIFICATION.md` reports and safe synthetic `negative-tests/`
cases, then writes `aggregate/falsification-report.json` and
`aggregate/FALSIFICATION_REPORT.md`. The evaluator looks for likely false
positives, likely false negatives, malformed inputs, unsupported assumptions,
overclaiming language, weak evidence grounding, and public hygiene failures.

The pass does not claim legal novelty or patentability. It can only keep a
result reviewable, mark it as `needs_revision`, flag `overclaims`, mark
`insufficient_tests`, or block it. Corpus showcase selection uses that status
so failed falsification removes showcase eligibility without deleting evidence.

## Beta.22 Public Beta UX

```bash
sovryn public-beta check --json
npm run demo:public-beta
```

The public beta layer is tester-facing. It checks Node.js, build output,
onboarding docs, worker doctor evidence, corpus target configuration,
safe corpus-autopublish defaults, and demo evidence. The one-command demo
creates a temporary repository, runs a safe external research fixture, validates
through Node Alpha, and prepares corpus autopublish as a dry-run only.

Generated artifacts:

```text
.sovryn/public-beta/
  public-beta-check.json
  public-beta-demo.json
  PUBLIC_BETA_READINESS.md
  PUBLIC_BETA_DEMO_REPORT.md
```

The public beta demo does not push to GitHub and does not create standalone
repositories. Public beta outputs remain Open Source Research Artifacts, not
legal patent filings or legal opinions.
