# Public Review URL Audit

## Decision

Status: `blocked`

This audit verifies that the public corpus exposes a reviewer-facing URL index for the active candidate. It does not claim external human review, independent reproduction, field uptake, prize significance, or broad validation.

## Candidate

- Candidate ID: missing
- Result slug: autonomous-research-program-continuity-batches5-8
- Result path: results/autonomous-research-program-continuity-batches5-8
- Target repo: /Users/sovryn/Desktop/sovryn-open-inventions
- External expert validation claimed by Sovryn: no

## Files

| File | Exists | Forbidden claim findings |
| --- | --- | --- |
| results/autonomous-research-program-continuity-batches5-8/README.md | yes | none |
| results/autonomous-research-program-continuity-batches5-8/SUMMARY.json | yes | none |
| results/autonomous-research-program-continuity-batches5-8/PUBLIC_REVIEW_URLS.md | no | none |
| results/autonomous-research-program-continuity-batches5-8/EXTERNAL_REVIEW_REQUEST.md | no | none |
| results/autonomous-research-program-continuity-batches5-8/EXTERNAL_REVIEW_RECORD_TEMPLATE.json | no | none |
| results/autonomous-research-program-continuity-batches5-8/EXTERNAL_REVIEW_INTAKE_INSTRUCTIONS.md | no | none |

## URLs

| URL | Expected host | Raw GitHub | Repository URL |
| --- | --- | --- | --- |


## Gates

| Gate | Status | Meaning |
| --- | --- | --- |
| dispatch_ready | fail | Public URL audit requires internal external-review dispatch readiness. |
| corpus_index_has_candidate | pass | Corpus INDEX must expose the active candidate by candidateId or sourceCandidateId. |
| required_public_review_files_exist | fail | Public package must include review URL index, request, template, instructions, README, and SUMMARY. |
| summary_matches_dispatch | fail | SUMMARY.json must bind the public URL package to the active dispatch state without claiming review. |
| review_template_matches_candidate | fail | External review template must match the active candidate and include intake-required fields. |
| review_template_uses_current_schema | fail | External review template and intake instructions must require the current review record schema version. |
| public_review_scoring_contract_requires_external_url | fail | Public review template and intake instructions must state that score-impacting supportive reviews require an external public URL. |
| public_review_requires_source_receipt | fail | Public review template and intake instructions must require a fetch receipt for external review URLs before score impact. |
| public_review_urls_present | fail | PUBLIC_REVIEW_URLS.md must expose the core reviewer and raw replay inputs. |
| public_review_urls_expected_host | fail | Public review URLs must point to the public sovryn-open-inventions GitHub repository or raw host. |
| raw_download_urls_present | fail | Public URL index must include raw GitHub download links for reviewer inputs. |
| no_forbidden_public_claims | pass | Public review URL surfaces must avoid prohibited overclaim categories. |

## Next Human Action

Repair public corpus review URL files, candidate binding, template fields, or overclaim findings before requesting review.
