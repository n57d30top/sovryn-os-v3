# External Review Intake

## Decision

Status: `awaiting_external_review`

This intake records independent human review files when they exist. It does not claim prize significance, field uptake, or outside validation merely because a package is ready for review.

## Candidate

- Candidate ID: missing
- Fund class: pipeline_fund_candidate
- Package path: missing
- Review directory: .sovryn/nobel-readiness/external-review-reviews
- External expert validation claimed by Sovryn: no
- Score impact: none_awaiting_external_review

## Review Summary

- Review records: 0
- Valid review records: 0
- Supportive review records: 0
- Independent reproductions recorded: 0
- Revision or rejection records: 0

## Records

| Path | Valid | Decision | Reproduction | Novelty | Supportive | Revision/rejection | Reasons |
| --- | --- | --- | --- | --- | --- | --- | --- |
| none | no | missing | missing | missing | no | no | awaiting external human review |

## Gates

| Gate | Status | Meaning |
| --- | --- | --- |
| handoff_exists | fail | External review intake is bound to the current handoff package. |
| review_records_parse | pass | Review records must be valid JSON. |
| review_records_use_current_schema | pass | Review records must declare the current external human review schema version before they can affect readiness. |
| valid_reviews_match_candidate | pass | Valid review records must match the active Fund candidate identity. |
| review_sources_resolve | pass | Valid review records require public-safe review source refs. |
| external_review_sources_have_valid_receipts | pass | External review URL records require a locally fetched source receipt with URL, hash, candidate binding, and current schema binding. |
| no_forbidden_review_claims | pass | External review records must not contain prohibited overclaim text. |
| invalid_reviews_do_not_raise_score | pass | Invalid or unverified reviews are recorded but cannot increase readiness scores. |
| supportive_review_requires_reproduction_and_novelty | pass | A supportive review can affect scoring only with independent reproduction and bounded novelty assessment. |
| supportive_review_requires_external_source | pass | A supportive review can affect scoring only when its source ref is an external public URL, not a local self-report. |
| independent_reproduction_requires_external_source | pass | Independent external reproduction can clear bounded-100 blockers only when its review source is an external public URL. |

## Next Human Action

Place candidate-matching external human review JSON records in .sovryn/nobel-readiness/external-review-reviews, then rerun this intake.
