# Public Review URL Audit

## Decision

Status: `public_review_urls_ready`

This audit verifies that the public corpus exposes a reviewer-facing URL index for the active candidate. It does not claim external human review, independent reproduction, field uptake, prize significance, or broad validation.

## Candidate

- Candidate ID: DISCOVERY-LIFT-INSIGHT-HARD-GEN-BOUNDED-GRAPH-MINOR-OBSTRUCTION-SIGNIFI-4E76B8436316
- Result slug: first-formal-discovery-fund-graph-minor-obstruction-boundary
- Result path: results/first-formal-discovery-fund-graph-minor-obstruction-boundary
- Target repo: /Users/sovryn/Desktop/sovryn-open-inventions
- External expert validation claimed by Sovryn: no

## Files

| File | Exists | Forbidden claim findings |
| --- | --- | --- |
| results/first-formal-discovery-fund-graph-minor-obstruction-boundary/README.md | yes | none |
| results/first-formal-discovery-fund-graph-minor-obstruction-boundary/SUMMARY.json | yes | none |
| results/first-formal-discovery-fund-graph-minor-obstruction-boundary/PUBLIC_REVIEW_URLS.md | yes | none |
| results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_REQUEST.md | yes | none |
| results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_RECORD_TEMPLATE.json | yes | none |
| results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_INTAKE_INSTRUCTIONS.md | yes | none |

## URLs

| URL | Expected host | Raw GitHub | Repository URL |
| --- | --- | --- | --- |
| https://github.com/n57d30top/sovryn-open-inventions/blob/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_RECORD_TEMPLATE.json | yes | no | yes |
| https://github.com/n57d30top/sovryn-open-inventions/blob/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_REQUEST.md | yes | no | yes |
| https://github.com/n57d30top/sovryn-open-inventions/blob/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/README.md | yes | no | yes |
| https://github.com/n57d30top/sovryn-open-inventions/blob/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/REVIEWER_SUMMARY.md | yes | no | yes |
| https://github.com/n57d30top/sovryn-open-inventions/tree/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary | yes | no | yes |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/CLAIM_EVIDENCE_BINDINGS.json | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_INTAKE_INSTRUCTIONS.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_RECORD_TEMPLATE.json | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/EXTERNAL_REVIEW_REQUEST.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/FORMAL_REPRODUCTION_RESULT.json | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/LIMITATIONS.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/METHOD.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/PAPER.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/README.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/REPRODUCE.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/REVIEWER_SUMMARY.md | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/raw-reproduction-bundle/formal-object-check-manifest.json | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/raw-reproduction-bundle/formal-source-cache.json | yes | yes | no |
| https://raw.githubusercontent.com/n57d30top/sovryn-open-inventions/main/results/first-formal-discovery-fund-graph-minor-obstruction-boundary/reproduce_graph_minor_candidate.py | yes | yes | no |

## Gates

| Gate | Status | Meaning |
| --- | --- | --- |
| dispatch_ready | pass | Public URL audit requires internal external-review dispatch readiness. |
| corpus_index_has_candidate | pass | Corpus INDEX must expose the active candidate by candidateId or sourceCandidateId. |
| required_public_review_files_exist | pass | Public package must include review URL index, request, template, instructions, README, and SUMMARY. |
| summary_matches_dispatch | pass | SUMMARY.json must bind the public URL package to the active dispatch state without claiming review. |
| review_template_matches_candidate | pass | External review template must match the active candidate and include intake-required fields. |
| public_review_urls_present | pass | PUBLIC_REVIEW_URLS.md must expose the core reviewer and raw replay inputs. |
| public_review_urls_expected_host | pass | Public review URLs must point to the public sovryn-open-inventions GitHub repository or raw host. |
| raw_download_urls_present | pass | Public URL index must include raw GitHub download links for reviewer inputs. |
| no_forbidden_public_claims | pass | Public review URL surfaces must avoid prohibited overclaim categories. |

## Next Human Action

Send the public review URL index to independent reviewers and intake returned review JSON records only after real review exists.
