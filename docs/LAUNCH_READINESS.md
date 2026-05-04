# Launch Readiness

Sovryn OS v3 `3.0.0-beta.22` includes launch-readiness commands for local
public beta or v1.0-RC review:

```bash
sovryn launch check --json
sovryn launch demo --json
sovryn launch package --json
sovryn launch v1-rc-check --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
```

Launch readiness is not a publication command. It aggregates beta evidence,
security audit evidence, reliability replay evidence, public corpus export
evidence, and pilot results. Real GitHub publication remains governed by Sovryn
publication gates and human approval.

Beta.16 adds a public corpus product check path for launch reviewers:

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

The generated `public-corpus/` site and API make release candidates easier to
inspect while retaining the same public-hygiene restrictions: no raw logs, no
secrets, no local absolute paths, no private config, no unsafe content, and no
legal patentability or freedom-to-operate claims.

Beta.17 adds a stricter v1-RC gate check for the overnight external trial:

```bash
sovryn overnight run --goal "Generate safe external open inventions" --max-runs 3 --autopublish-corpus --json
sovryn launch v1-rc-check --json
```

The v1-RC check requires replay-critical evidence, security and reliability
audits, public corpus site audit, public hygiene, at least five corpus results,
three external-domain trial results, at least two custom tools, at least two
successful Node Alpha executions, and no standalone repo creation.

Beta.18 adds public corpus lifecycle curation as a launch-readiness input.
Beta.19 adds real-source campaign evidence as a launch-readiness input:
showcase and corpus candidates are stronger when source cards are bound to
concrete public-source adapter/cache results rather than fixture fallback,
query links, adapter failures, or mock placeholders.
Beta.20 adds showcase readability as a launch-readiness input: selected
showcase results must include README, SHOWCASE, METHOD, REPRODUCE, LIMITATIONS,
and EXAMPLES documents with clear problem/method/test/limitation language.
`corpus site build` now writes `aggregate/version-groups.json`,
`aggregate/superseded-map.json`, `aggregate/showcase-results.json`,
`aggregate/revision-queue.json`, and status reports. The site audit checks that
`needs_revision`, `blocked`, `demo_pilot`, and `superseded` results are not
showcase outputs and that `INDEX.json` includes lifecycle fields for every
result. It also checks showcase documentation, specificity thresholds,
anti-template readiness, and public showcase links.

Beta.9 writes three pilot release-candidate records under `.sovryn/pilots/`.
Each pilot includes Factory/Open Invention bindings, quality evaluation,
security audit, reliability replay, publication review/audit, publication
dry-run intent, corpus entry, release registry update, and human review
checklist. Pilot packaging copies only curated summaries and reports.

Beta.9 launch checks separate:

- blocking limitations, which fail launch readiness;
- accepted beta limitations, which are documented for human review;
- informational limitations, which do not affect launch readiness.

The E2E scorecard fails on blocking launch limitations and uses
replay-critical pass rate for readiness decisions.

Beta.21 adds falsification status as a public corpus launch input. Showcase
results should either have `passes_falsification` or be explicitly unevaluated
before the falsification pass is required. Results labeled `needs_revision`,
`overclaims`, `insufficient_tests`, or `blocked` must not remain showcase until
the public result is fixed and `sovryn evaluate falsify-all` is rerun.

Beta.22 adds public beta UX readiness:

```bash
sovryn public-beta check --json
npm run demo:public-beta
```

The public beta check records Node/build/doc status, worker doctor evidence,
corpus target configuration, safe corpus-autopublish defaults, and dry-run-only
demo evidence. It is a tester-facing readiness layer and does not replace
security, reliability, falsification, corpus site, or v1-RC gates.

## v1.0 Gate Set

- `INSTALL_ON_FRESH_MACHINE`
- `BETA_DEMO_REPRODUCIBLE`
- `OVERNIGHT_RUN_REPRODUCIBLE`
- `SECURITY_AUDIT_GREEN`
- `RELIABILITY_AUDIT_GREEN`
- `QUALITY_BENCHMARK_PASSING`
- `PUBLIC_CORPUS_EXPORT_GREEN`
- `PUBLIC_CORPUS_SITE_AUDIT_GREEN`
- `THREE_RELEASE_CANDIDATES_PRESENT`
- `NO_PUBLIC_LEAKS`
- `NO_FAKE_LEGAL_CLAIMS`
- `DOCS_COMPLETE`
- `CI_GREEN`

The current launch check implements the local subset that can be verified
without external GitHub Actions state. Operators should confirm CI status and
real-world pilot quality before tagging a release candidate.

## Pilot Scenarios

Built-in pilot scenarios:

1. Evidence-chain format for replayable autonomous research-agent records.
2. Policy-gated toolchain installation on Linux research nodes.
3. Corpus deduplication of defensive publications.

Each pilot should produce an Opportunity, Factory run, source evidence, claim
matrix, counter-evidence, prototype/tests, worker execution or unavailable
worker evidence, replay, quality evaluation, audit evidence, release candidate,
corpus entry, and public demo bundle.

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not file legal patents and does not provide legal
novelty, patentability, or freedom-to-operate opinions.
