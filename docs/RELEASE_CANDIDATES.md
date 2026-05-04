# Release Candidates

Alpha.21 adds a release-candidate workflow for preparing reviewable Open
Invention releases from existing Factory Mode infrastructure.

```bash
sovryn release candidates build --max 3 --json
sovryn release candidates review --json
sovryn release candidates package --json
```

The build command runs up to three fixture-backed strong Factory goals:

- verifiable autonomous research agents,
- evidence-bound source-card trust scoring,
- container-isolated prototype validation for autonomous research agents.

Each candidate must bind:

- a Factory run,
- a generated Open Invention mission,
- curated Factory public evidence,
- publication intent,
- prototype execution evidence,
- replay evidence,
- corpus duplicate-risk review,
- release-readiness scoring.

Artifacts are written under:

```text
.sovryn/releases/candidates/
  release-candidates.json
  release-candidate-review.json
  publication-queue.json
  RELEASE_CANDIDATES.md
  RELEASE_CANDIDATE_REVIEW.md
  PUBLICATION_QUEUE.md
  public/
```

## Review Gates

Release-candidate review checks:

- `RELEASE_CANDIDATE_COMPLETE`
- `FACTORY_REPLAY_PASSED`
- `PUBLIC_EVIDENCE_COMPLETE`
- `PROTOTYPE_EXECUTION_PASSED`
- `CORPUS_DUPLICATE_REVIEWED`
- `NO_RAW_LOGS_IN_RELEASE`
- `NO_SECRETS_IN_RELEASE`
- `NO_LEGAL_PATENTABILITY_CLAIMS`
- `QUALITY_SCORE_ABOVE_MINIMUM`
- `HUMAN_REVIEW_REQUIRED_FOR_REAL_PUBLISH`

The workflow intentionally keeps real publication separate. Release candidates
are queued for human review and do not publish to GitHub automatically. Real
publication still requires the existing Open Invention finalization, safety,
secret, license, replay, and GitHub publication gates.

Alpha.22 adds the `QUALITY_SCORE_ABOVE_MINIMUM` gate. Release-candidate build
writes a quality evaluation for each generated Factory run, and review blocks
publish-ready queueing if the candidate falls below
`research.quality.minReleaseQualityScore`.

## Public Package

`sovryn release candidates package --json` copies only curated public evidence
into `.sovryn/releases/candidates/public/`. It must not include raw command
logs, stdout/stderr, secrets, private config, local absolute paths, or legal
patentability claims.

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not file legal patents and does not provide legal
novelty, patentability, or freedom-to-operate opinions.
