# Launch Readiness

Sovryn OS v3 `3.0.0-beta.13` includes launch-readiness commands for local
public beta or v1.0-RC review:

```bash
sovryn launch check --json
sovryn launch demo --json
sovryn launch package --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
```

Launch readiness is not a publication command. It aggregates beta evidence,
security audit evidence, reliability replay evidence, public corpus export
evidence, and pilot results. Real GitHub publication remains governed by Sovryn
publication gates and human approval.

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

## v1.0 Gate Set

- `INSTALL_ON_FRESH_MACHINE`
- `BETA_DEMO_REPRODUCIBLE`
- `OVERNIGHT_RUN_REPRODUCIBLE`
- `SECURITY_AUDIT_GREEN`
- `RELIABILITY_AUDIT_GREEN`
- `QUALITY_BENCHMARK_PASSING`
- `PUBLIC_CORPUS_EXPORT_GREEN`
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
