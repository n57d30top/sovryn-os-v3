# External Review Intake Instructions

## Where To Put Returned Review Records

Place each returned review JSON record in:

`.sovryn/nobel-readiness/external-review-reviews`

Then run:

`sovryn nobel-readiness external-review-intake --json`

## Required Fields

- candidateId
- resultSlug
- reviewerRole
- reviewDate
- reviewSourceRef
- decision
- independentReproductionStatus
- noveltyAssessment
- evidenceRefs
- overclaimFindings

## Scoring Rule

Invalid, mismatched, unresolved, not-public-safe, non-external, rejecting, non-reproduced, known/trivial, or overclaiming review records cannot increase readiness. A supportive record can affect readiness only when it matches the active candidate, resolves to an external public URL, records independent reproduction, and assesses the bounded claim as nontrivial and plausibly novel.
