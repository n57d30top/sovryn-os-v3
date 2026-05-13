# Nobel Discovery Readiness Layer v0

## Decision

Final label: `externally_review_ready_candidate`.

A bounded discovery-scored candidate package satisfies the internal external-review package readiness gates. This remains an internal readiness state and is not outside expert validation.

## Evidence Summary

- Readiness score: 76/100.
- Outside expert review readiness score: 78/100.
- Bounded 100% eligible: false.
- Bounded 100% status: blocked_external_review_pending.
- Bounded 100% blockers: readiness_score_below_100, valid_external_human_review_missing, supportive_external_human_review_missing, independent_external_reproduction_missing.
- Public validation major caveats: 0.
- Public live-source-only replay caveats: 0.
- Public formal replay ready: true.
- Public formal replay checks: 72; replay ready: true.
- Public formal holdout checks: 24; source families: 2; holdout ready: true.
- Public formal baselines: 3; signal-explaining baselines: 0; baseline resistance ready: true.
- Public formal rival explains rate: 0.25; rival pressure ready: true.
- Public formal frozen predictions: 12; executed: 12; supported: 9; non-obvious: 4; prediction ready: true.
- Public formal counterexample pressure ready: true.
- Public formal counterexample checks: 72; collapsed checks: 0.
- External human review status: awaiting_external_review.
- External human review records: 0/0; supportive: 0; independent reproductions: 0; score impact: none_awaiting_external_review.
- Safety score: 100/100.
- Overclaim risk score: 22/100.

## Public Validation Caveats

- None recorded.

## Public Replay Caveats

- None recorded.

## Claim Boundary

This package claims only that the readiness process executed deterministic filters, frozen predictions, executions, holdouts, counterexample checks, replay attempts, rival review, and adversarial narrowing. It does not claim outside review, prize significance, or real-world validation.
