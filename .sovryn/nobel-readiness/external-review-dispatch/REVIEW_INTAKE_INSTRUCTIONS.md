# External Review Intake Instructions

## Where To Put Returned Review Records

Place each returned review JSON record in:

`.sovryn/nobel-readiness/external-review-reviews`

Then run:

`sovryn nobel-readiness external-review-intake --json`

## Required Fields

- reviewRecordSchemaVersion
- candidateId
- resultSlug
- reviewerRole
- reviewDate
- reviewSourceRef
- reviewSourceReceiptRef
- decision
- independentReproductionStatus
- noveltyAssessment
- evidenceRefs
- overclaimFindings

## Scoring Rule

Invalid, stale-schema, missing-source-receipt, mismatched, unresolved, not-public-safe, non-external, rejecting, non-reproduced, known/trivial, or overclaiming review records cannot increase readiness. A supportive record can affect readiness only when it declares `sovryn_external_human_review_v1`, matches the active candidate, resolves to an external public URL, includes a valid source receipt with hash and candidate binding, records independent reproduction, and assesses the bounded claim as nontrivial and plausibly novel.
