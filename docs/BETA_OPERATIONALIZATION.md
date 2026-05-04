# Beta Operationalization

Sovryn OS v3 `3.0.0-beta.13` adds an operational proof layer above the Alpha
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
