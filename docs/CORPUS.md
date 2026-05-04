# Corpus

The corpus layer indexes generated Factory runs, Open Inventions, source cards,
claim features, quality scores, duplicate-risk relationships, and release
metadata.

```bash
sovryn corpus index --json
sovryn corpus search "verifiable evidence" --json
sovryn corpus export-public --json
sovryn corpus site build --json
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus explain <id> --json
sovryn corpus explain-result chemistry-record-auditor-tool-v2 --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus publish-status --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
```

Public corpus export is curated. It must not include raw command logs, secrets,
private config, local absolute paths, full raw source content, or legal
patentability claims.

The corpus improves future opportunity scans and helps reduce duplicate
research. It is evidence memory, not a legal patent registry.

## Corpus Autopublish

Beta.10 adds a narrow autopublish path for the existing public corpus repo:

```text
https://github.com/n57d30top/sovryn-open-inventions
```

`corpus autopublish` does not create repositories and does not require human
review for this corpus path. It still blocks unless automated gates pass:
quality `good` or `excellent`, `dry_run_ready` or `review_ready` status,
evidence strength >= 80, reproducibility >= 90, publication safety >= 85,
replay-critical pass rate 100, security/safety/reliability/public-hygiene pass,
and publication dry-run evidence present.

The target repo receives only curated result folders, summaries, verification
records, publication intent, and aggregate ledgers. Raw logs, stdout/stderr,
secrets, local absolute paths, private config, dangerous content, fake legal
claims, and full raw source dumps are blocked.

Every autopublished result states that it is an autonomous open-research
artifact, not a patent filing, not a patentability opinion, not a legal novelty
opinion, and not a freedom-to-operate opinion.

## Beta.11 External Research Result

Beta.11 adds a safe external research proof that can feed the corpus:

```bash
sovryn external-research run chemistry-record-auditor --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
```

The run builds `mol-record-auditor`, provisions `pint` under policy, validates
the prototype through Node Alpha, and publishes only curated evidence if the
same corpus autopublish gates pass. It is chemistry-style data-quality auditing
only, not synthesis, wet-lab guidance, drug design, hazardous optimization, or a
legal opinion.

## Beta.12 High-Assurance v2 Result

Beta.12 adds a versioned high-assurance chemistry auditor path:

```bash
sovryn external-research run chemistry-record-auditor --profile container-netoff --json
```

The generated slug is `chemistry-record-auditor-tool-v2`. The public corpus
entry is eligible only when package provisioning evidence exists, final
validation uses `container-netoff` with network disabled, no silent fallback is
recorded, public hygiene passes, replay-critical evidence remains fresh, and the
same automated corpus-autopublish gates pass.

## Beta.13 External Energy Result

Beta.13 adds a second external-domain run:

```bash
sovryn external-research run energy-record-auditor --profile container-netoff --json
```

The generated slug is `energy-usage-anomaly-auditor`. It uses a synthetic,
anonymized toy energy dataset and policy-provisioned `pandas` evidence to audit
duplicate timestamps, missing intervals, high-usage spikes, weather-normalized
anomalies, and weak provenance. The public result must not include private
smart-meter data, household-identifying data, surveillance workflows, or
energy-market trading advice.

## Beta.14 Multi-Domain Campaign

Beta.14 adds a campaign-level external research proof:

```bash
sovryn external-research campaign multi-domain --fixture-install --json
```

The campaign binds three safe external domains: chemistry-style data quality,
synthetic energy anomaly auditing, and defensive software patch-risk auditing.
The software-supply-chain result uses `patch-risk-auditor` and synthetic toy
patches only. It must not include unsafe operational instructions, harmful code,
real target systems, raw logs, secrets, local paths, or legal patentability
claims.

## Beta.15 Anti-Template Quality Gates

Beta.15 adds quality gates for specificity, source specificity, prototype
relevance, test nontriviality, limitation honesty, non-template language,
claim/evidence grounding, counter-evidence relevance, and public readability.

```bash
sovryn corpus quality-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

The audit is read-only against the public corpus repository and writes
`.sovryn/quality/corpus-quality-audit.json` plus `CORPUS_QUALITY_AUDIT.md`.
Autopublish now rejects results that are hygienic but too generic or shallow.

## Beta.16 Public Corpus Product Layer

Beta.16 turns the existing `sovryn-open-inventions` repo into a readable public
corpus surface rather than only a folder/JSON archive.

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus explain-result patch-risk-auditor --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

The target repo receives:

```text
public-corpus/
  index.html
  corpus.json
  search-index.json
  results.json
  quality.json
  sources.json
  status.json
  api/
    results.json
    sources.json
    quality.json
    releases.json
    graph.json
  badges/
  results/<slug>.html
aggregate/
  status-summary.json
  domain-summary.json
  result-graph.json
```

Each public result page shows the problem, method summary, custom tool,
external package/tool evidence, Node Alpha worker profile, quality scores,
limitations, safety scope, and links to curated public artifacts. The site
audit scans the whole target repo for raw logs, secrets, local paths, private
config, unsafe content, and fake legal claims.

This product layer is still an open-research corpus. It is not a patent filing,
not a patentability opinion, not a legal novelty opinion, and not a
freedom-to-operate opinion.

## Beta.17 Overnight External Trial

Beta.17 uses the corpus autopublish and site-audit layers as launch gates for a
bounded external overnight trial:

```bash
sovryn overnight run --goal "Generate safe external open inventions" --max-runs 3 --autopublish-corpus --json
sovryn launch v1-rc-check --json
```

Eligible outputs are still published only to the existing
`sovryn-open-inventions` corpus repo. Weak, unsafe, non-specific, or leaky
outputs remain rejected or marked for revision.

## Beta.18 Corpus Lifecycle Curation

Beta.18 makes the public corpus status-aware without deleting old evidence.
`corpus site build` now regenerates `INDEX.json`, `public-corpus/`, and
aggregate reports with lifecycle and version metadata for every result.

Each indexed result includes:

- `lifecycleStatus`
- `versionGroup`
- `supersedes`
- `supersededBy`
- `showcaseEligible`
- `showcaseRank`
- `revisionReason`
- `humanReadableSummary`
- `domain`
- `resultKind`

Generated aggregate files:

```text
aggregate/version-groups.json
aggregate/superseded-map.json
aggregate/showcase-results.json
aggregate/revision-queue.json
CORPUS_STATUS.md
SHOWCASE_RESULTS.md
REVISION_QUEUE.md
VERSIONING.md
```

Lifecycle values are explicit: `demo_pilot`, `draft`, `dry_run_ready`,
`autopublished`, `showcase`, `needs_revision`, `superseded`, and `blocked`.
Results marked `needs_revision`, `blocked`, `demo_pilot`, or `superseded` cannot
be showcase results. The audit verifies version groups, superseded maps,
showcase output, lifecycle fields in `INDEX.json`, and consistency between the
index and public site.

## Beta.19 Real-Source Campaign Corpus Gates

Beta.19 adds a real-source external campaign that can feed the corpus only when
concrete public-source evidence is strong enough:

```bash
sovryn external-research campaign real-sources --domains 3 --json
sovryn external-research campaign real-sources --domains 3 --fixture-sources --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
```

Each domain writes:

```text
.sovryn/external-research/real-source-campaign/<domain>/
  real-source-search.json
  source-readings.json
  source-cards.json
  source-cards/<source-id>.json
  source-cards/<source-id>.md
  claim-feature-matrix.json
  counter-evidence.json
  experiment-plan.json
  benchmark-plan.json
  REAL_SOURCE_EVIDENCE.md
```

The public release receives only curated summaries such as
`real-source-search.summary.json` and `REAL_SOURCE_EVIDENCE.md`. Raw adapter
logs, command journals, stdout/stderr, local paths, secrets, and full raw source
content remain excluded.

For real-source campaign results, corpus autopublish adds gates for source-card
binding and threshold satisfaction. A result with only query links, adapter
failures, mock placeholders, or declared `fixture_fallback` records is recorded
as degraded or `needs_revision`; it is not allowed into the public corpus as an
autopublished result.

## Beta.20 Showcase Result Documents

Beta.20 promotes only high-quality, human-readable showcase results. Running
the site build:

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

writes the following files for each selected showcase result:

```text
results/<slug>/
  README.md
  SHOWCASE.md
  METHOD.md
  REPRODUCE.md
  LIMITATIONS.md
  EXAMPLES.md
```

The README is rewritten for human readers with a clear problem statement,
method, custom tool, tests, source evidence summary, counter-evidence and
limitations, reproduction path, autopublish record, and safety scope. Showcase
selection requires `good` or `excellent` quality, specificity score at least
75, anti-template status `review_ready` or better, reproducibility score at
least 90, publication-safety score at least 90, replay-critical pass rate 100,
and public hygiene passed. Results marked `needs_revision`, `blocked`,
`demo_pilot`, or `superseded` stay visible but cannot become showcase entries.

## Beta.21 Independent Falsification

Beta.21 adds a public-corpus evaluation pass that tries to weaken or falsify a
result before it remains showcase:

```bash
sovryn evaluate falsify <result-slug> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn evaluate falsify-all --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

Per result, Sovryn writes:

```text
results/<slug>/
  FALSIFICATION.md
  negative-tests/
    negative-tests.json
    <negative-test-id>.json
```

The aggregate report is written to `aggregate/falsification-report.json` and
`aggregate/FALSIFICATION_REPORT.md`. Falsification checks domain-specific safe
synthetic negative cases, false-positive risk, false-negative risk, malformed
inputs, unsupported assumptions, overclaiming language, public hygiene, and
evidence grounding. A failed result is not hidden, but its
`falsificationStatus` can move it to `needs_revision`, `overclaims`, or
`blocked`, which removes showcase eligibility until the public result is fixed
and re-evaluated.

## Beta.22 Public Beta Corpus Dry-Run

`npm run demo:public-beta` creates a temporary corpus target and runs corpus
autopublish in dry-run mode only. This proves that public corpus packaging works
for external testers without pushing to GitHub or requiring a token.

Before any real corpus update, run:

```bash
sovryn corpus publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```
