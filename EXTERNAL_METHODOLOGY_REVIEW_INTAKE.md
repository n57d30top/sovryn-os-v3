# External Methodology Review Intake

This file defines the concrete handoff path for independent benchmark-methodology review of the second-survivor package.

It is an intake specification only. It does not claim external validation, external adoption, Nobel-readiness, Einstein-level status, or Fund notification.

## Candidate

Candidate ID: DISCOVERY-BENCH-TRIAGE-SECOND-INDEPENDENT-SURVIVOR-001
Public package: https://github.com/n57d30top/sovryn-open-inventions/tree/main/results/second-survivor-benchmark-triage-methodology-review-intake
Current class before external review: `pipeline_fund_candidate`
Current notification state: `notificationAllowed=false`, `FUND_FOUND=false`

## Reviewer Task

A reviewer must independently rerun or inspect the public OpenML receipts, recompute the survivor table, and decide whether the receipt-first triage method has bounded benchmark-methodology value beyond replay mechanics, reject-all, source-family-only evidence, and simple heuristic rivals.

## Required Review Record Path

Place a real review JSON record in:

```text
.sovryn/nobel-readiness/external-review-reviews/
```

The record must use `sovryn_external_human_review_v1` and match `DISCOVERY-BENCH-TRIAGE-SECOND-INDEPENDENT-SURVIVOR-001`.

## Required External Source Receipt

For an external URL review, first run:

```bash
sovryn nobel-readiness external-review-source-receipt --url <external-review-url> --json
```

Then include the generated `reviewSourceReceiptRef` in the review JSON.

## Intake Command

```bash
sovryn nobel-readiness external-review-intake --json
```

## Supportive Review Requirements

- `decision` must be `accepted_with_caveats`.
- `independentReproductionStatus` must be `reproduced`.
- `noveltyAssessment` must be `nontrivial_and_plausibly_novel`.
- The review source must be an external public URL with a valid source receipt.
- The review must contain no forbidden overclaim text.

## Current Replay Targets

| Claim                     | Task | Dataset   | Raw ARFF receipt                                        |
| ------------------------- | ---: | --------- | ------------------------------------------------------- |
| SA-PLAUS-003-OPENML-32    |   32 | pendigits | https://openml.org/data/v1/download/32/pendigits.arff   |
| SECOND-SURV-001-OPENML-59 |   59 | iris      | https://openml.org/data/v1/download/61/iris.arff        |
| SECOND-SURV-003-OPENML-7  |    7 | audiology | https://openml.org/data/v1/download/7/audiology.arff    |
| SECOND-SURV-005-OPENML-53 |   53 | vehicle   | https://openml.org/data/v1/download/54/vehicle.arff     |
| SECOND-SURV-006-OPENML-36 |   36 | segment   | https://openml.org/data/v1/download/36/segment.arff     |
| SECOND-SURV-007-OPENML-43 |   43 | spambase  | https://openml.org/data/v1/download/44/spambase.arff    |
| SECOND-SURV-008-OPENML-15 |   15 | breast-w  | https://openml.org/data/v1/download/52350/breast-w.arff |

## Fail-Closed Rule

If the review is missing, local-only, partially reproduced, major-revision, rejected, known/trivial, or missing a valid source receipt, the candidate remains non-notifying and cannot close Einstein/Nobel readiness.
