# Reviewer Checklist

| Gate | Question | Evidence refs | Required outcome |
| --- | --- | --- | --- |
| claim_identity | Does the package preserve the exact candidate identity and claim without scope drift? | .sovryn/discovery-daemon/evidence-packages/DISCOVERY-LIFT-INSIGHT-HARD-GEN-MATBENCH-DESCRIPTOR-TRANSFER-SIGNIFICAN-74933C45<br>CLAIM_EVIDENCE_BINDINGS.json#candidateId | Reviewer confirms the reviewed claim is the same bounded package claim or requests revision. |
| method_reproduction | Can the method and replay instructions be followed from the cited artifacts? | METHOD.md#method<br>REPRODUCE.md#replay | Reviewer records successful reproduction, bounded replay caveat, or blocking failure. |
| evidence_bindings | Do the claim-evidence bindings connect every major claim element to resolvable evidence? | CLAIM_EVIDENCE_BINDINGS.json | Reviewer confirms bindings are inspectable and sufficient or lists missing evidence. |
| baseline_rival_holdout_pressure | Do baselines, rival mechanisms, holdouts, counterexamples, and replay pressure support the bounded claim? | CLAIM_EVIDENCE_BINDINGS.json#baseline<br>CLAIM_EVIDENCE_BINDINGS.json#rival<br>CLAIM_EVIDENCE_BINDINGS.json#holdoutEvidenceRefs<br>CLAIM_EVIDENCE_BINDINGS.json#counterexampleEvidenceRefs<br>CLAIM_EVIDENCE_BINDINGS.json#replayEvidenceRefs | Reviewer confirms the pressure is nonfatal for the bounded claim or identifies a fatal blocker. |
| limitations_and_no_overclaim | Are limitations explicit, and does the package avoid prohibited overclaim categories? | LIMITATIONS.md#limitations<br>PAPER.md#evidence-summary | Reviewer confirms limitations are adequate or requests narrower wording. |
