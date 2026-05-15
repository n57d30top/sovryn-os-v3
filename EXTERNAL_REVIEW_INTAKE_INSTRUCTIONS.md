# External Review Intake Instructions

Run `sovryn nobel-readiness external-review-intake --json` only after a real independent review record exists.

Review records must preserve `reviewRecordSchemaVersion: sovryn_external_human_review_v1`, match `DISCOVERY-BENCH-TRIAGE-SECOND-INDEPENDENT-SURVIVOR-001`, and include `reviewSourceReceiptRef` for external URL records.

Generate the source receipt with:

```bash
sovryn nobel-readiness external-review-source-receipt --url <reviewSourceRef> --json
```

Invalid, stale-schema, missing-source-receipt, non-external, local-only, major-revision, rejected, not-reproduced, known/trivial, or overclaiming records cannot increase readiness. A supportive record can affect readiness only when it resolves to an external public URL and has a valid source receipt.
