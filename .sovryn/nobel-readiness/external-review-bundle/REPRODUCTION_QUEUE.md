# Reproduction Queue

| Step | Action | Input refs | Expected evidence | Status |
| --- | --- | --- | --- | --- |
| review-package-inventory | Open the package directory and verify required artifacts are present. | .sovryn/discovery-daemon/evidence-packages/DISCOVERY-LIFT-INSIGHT-HARD-GEN-MATBENCH-DESCRIPTOR-TRANSFER-SIGNIFICAN-74933C45 | Artifact inventory matches the handoff required-artifact table. | queued_for_human_review |
| review-claim-bindings | Inspect CLAIM_EVIDENCE_BINDINGS.json and sample every evidence-ref class. | CLAIM_EVIDENCE_BINDINGS.json | Each claim element has a resolvable, public-safe supporting ref. | queued_for_human_review |
| run-replay-path | Follow REPRODUCE.md and record whether replay succeeds or fails with bounded caveats. | REPRODUCE.md#replay | Reviewer-owned replay note with command/result summary. | queued_for_human_review |
| evaluate-scientific-pressure | Assess baseline, rival, holdout, counterexample, and mechanism-pressure artifacts. | METHOD.md#mechanism-pressure<br>CLAIM_EVIDENCE_BINDINGS.json#baseline<br>CLAIM_EVIDENCE_BINDINGS.json#rival | Reviewer decision: support, request changes, or reject the bounded claim. | queued_for_human_review |
