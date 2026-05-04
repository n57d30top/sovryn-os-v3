# Corpus Memory

Alpha.20 adds local corpus memory for autonomous open research. The corpus
indexes previous Factory runs, Open Inventions, source cards, release packages,
and duplicate-risk relationships so Sovryn can reduce repeated work and reuse
evidence in future opportunity scans.

```bash
sovryn corpus index --json
sovryn corpus search "verifiable autonomous research agents" --json
sovryn corpus dedupe --json
sovryn corpus report --json
sovryn release registry update --json
```

Artifacts are written under:

```text
.sovryn/corpus/
  corpus-index.json
  invention-registry.json
  source-registry.json
  duplicate-map.json
  feedback-index.json
  corpus-quality-report.json
  corpus-quality-report.md
  PUBLIC_RELEASES.md
  last-search.json
```

The corpus stores summaries, identifiers, source-card metadata, reuse counts,
readiness labels, and release metadata. It does not copy raw command logs, raw
stdout/stderr, full source contents, secrets, private config, or Node Alpha
workspace paths.

`source-registry.json` is built from concrete source cards. Query links, adapter
failures, and mock placeholders are not treated as reusable reviewed prior art.

`duplicate-map.json` uses conservative token-overlap similarity. It is a
duplicate-risk signal for human review, not an automatic block and not a legal
novelty conclusion.

`PUBLIC_RELEASES.md` is a public Open Invention registry. It can track dry-run
packages and real releases prepared by Sovryn Controller, but it is not a legal
patent filing, not a patentability opinion, and not a freedom-to-operate
opinion.

Opportunity scans read the corpus when present. Reusable source evidence and
duplicate-risk signals can become `corpus`-sourced research opportunities, which
helps Sovryn decide what to improve next.
