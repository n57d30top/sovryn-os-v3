# Research Quality Evaluator

Alpha.22 adds an evidence-based Research Quality Evaluator.

```bash
sovryn quality evaluate <factory-id> --json
sovryn quality evaluate-invention <mission-id> --json
sovryn quality compare <factory-id-a> <factory-id-b> --json
sovryn quality report --json
sovryn quality leaderboard --json
```

The evaluator writes:

```text
.sovryn/quality/
  evaluations/
  inventions/
  quality-report.json
  QUALITY_REPORT.md
  quality-leaderboard.json
  QUALITY_LEADERBOARD.md
  evaluator-rubric.json
  evaluator-findings.json
```

## Dimensions

The rubric scores:

- source quality,
- reading depth,
- claim mapping strength,
- counter-evidence strength,
- novelty-risk honesty,
- prototype relevance,
- test relevance,
- reproducibility,
- safety review quality,
- publication clarity,
- corpus uniqueness,
- defensive-publication value.

Quality labels are:

- `unacceptable`
- `weak`
- `acceptable`
- `good`
- `excellent`

## Findings

The evaluator detects:

- inflated strong readiness labels,
- shallow source readings,
- unsupported differentiators,
- missing counter-evidence,
- weak or trivial prototype tests,
- benchmark claims without benchmark execution,
- unsafe legal or patentability language,
- duplicate-like inventions,
- public release leakage risk.

## Gates

Quality gates include:

- `QUALITY_EVALUATION_PRESENT`
- `QUALITY_SCORE_ABOVE_MINIMUM`
- `NO_INFLATED_STRONG_LABEL`
- `PROTOTYPE_TESTS_NONTRIVIAL`
- `COUNTER_EVIDENCE_MEANINGFUL`
- `PUBLICATION_LANGUAGE_SAFE`

Release-candidate review uses quality evidence. A candidate below
`research.quality.minReleaseQualityScore` is blocked from publish-ready queueing.

## Scope

The evaluator is deterministic and evidence-based. It is not a legal patent
filing, not a legal novelty opinion, not a patentability opinion, and not a
freedom-to-operate opinion. Generated content and quality findings must be
reviewed by humans before serious public release.
