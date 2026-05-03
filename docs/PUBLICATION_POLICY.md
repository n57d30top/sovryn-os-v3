# Publication Policy

Publication is controlled by Sovryn gates. The autonomous agent prepares work;
Sovryn Controller decides whether publication may proceed.

GitHub publication is blocked unless:

- the invention dossier is complete
- README, SPEC, DEFENSIVE_PUBLICATION, PRIOR_ART, LICENSE, and CITATION files exist
- a prototype or demo exists
- tests or validation steps exist and final verification passes
- publication source is stable during final verification
- final verification records a publication source hash that matches current release source contents
- secret scanning passes across generated files, prototype files, config-like files, docs, and evidence
- no large text file is skipped by the publication scanners
- safety scanning passes
- prior-art notes and defensive publication text exist
- the prior-art matrix entries are structurally valid
- `evidence/public-source-search.json` is present, hash-valid, and bound to the dossier
- the prior-art matrix has concrete public-source results or deterministic MVP placeholders
- strict real-publish policy, when enabled, has concrete prior-art evidence instead of placeholders only
- Factory Mode evidence, when present, is strong enough for real publication
- factory-level public evidence, when packaged, is curated and free of raw command logs or detected secrets
- the GitHub target is present unless dry-run mode is used
- the mission is finalized for real publication

Publication decisions are written to:

```text
.sovryn/inventions/<slug>/evidence/publication-review.json
.sovryn/inventions/<slug>/evidence/final-verify.json
.sovryn/inventions/<slug>/evidence/publication-intent.json
.sovryn/inventions/<slug>/evidence/github-publication.json
```

Publication source hashing covers README, SPEC, defensive publication,
prior-art notes, novelty notes, source reviews, research synthesis, safety
review, citation, license, prototype, tests, and diagrams. Evidence and release
staging files are excluded so review artifacts do not invalidate their own
verification.

Release repositories publish a curated public evidence layer under
`evidence/public/`. That layer includes publication intent and redacted
summaries, including a public-source-search summary and source-review evidence
when Node Alpha generated it. If deep source reading ran, the release includes
`source-readings.summary.json` rather than raw fetched documents. Raw command
stdout/stderr logs, local command working directories, and final
controller-only GitHub publication evidence remain local by default.

For stricter real publication, set:

```json
{
  "research": {
    "requireConcretePriorArtForPublish": true
  }
}
```

Dry-runs can still package deterministic MVP placeholders. Real GitHub
publication then requires at least one concrete prior-art source from the
bound public-source evidence file.

Factory Mode adds `FACTORY_STRENGTH_FOR_PUBLISH`. Dry-runs can still package
weak factory output for inspection, but real GitHub publication is blocked when
`evidence/factory-score.json` exists and `canPublishStrongly` is false.

The Autonomous Open Research Factory has separate factory gates under
`.sovryn/factory/<slug>/factory-run.json`. `sovryn factory review` checks that
factory evidence files exist, hashes are bound, source readings reference the
current source-discovery hash, selected candidates and generated invention
missions exist, prototype/tests/safety/limitations are present, and
`release/public/` contains no raw command logs or detected secrets.

Sovryn does not guarantee novelty, patentability, freedom to operate, or legal
patent protection. Public publication may affect patent rights.
