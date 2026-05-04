# Experiment Plan

Experiments are planned validation steps for open-source research artifacts.
They are not benchmark success claims.

## exp-1

Purpose: validate that weak source evidence, stale hashes, and missing
prototype execution reduce factory readiness.

Claim features: source-feature-1, evidence-bound-publication-gate

Hypothesis: a generated prototype can expose weak evidence and stale replay
state before a public dry-run release is prepared.

Required command: `npm test`

Failure condition: the prototype reports high readiness for query-link-only,
stale, or unexecuted evidence.
