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
prior-art notes, novelty notes, safety review, citation, license, prototype,
tests, and diagrams. Evidence and release staging files are excluded so review
artifacts do not invalidate their own verification.

Release repositories publish a curated public evidence layer under
`evidence/public/`. That layer includes publication intent and redacted
summaries, including a public-source-search summary. Raw command stdout/stderr
logs, local command working directories, and final controller-only GitHub
publication evidence remain local by default.

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

Sovryn does not guarantee novelty, patentability, freedom to operate, or legal
patent protection. Public publication may affect patent rights.
