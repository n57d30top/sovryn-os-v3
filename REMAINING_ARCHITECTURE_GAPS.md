# Remaining Architecture Gaps

## P1 Gaps Deferred For Safety

### Fund state to OS closure reconciliation

The workspace contains pre-existing daemon Fund artifacts while OS closure state
is stale. This is not a wiring edit; it is a state reconciliation task.

Required next contract:

- read-only reconciliation report
- no capability status mutation unless explicitly authorized
- no Fund Gate changes
- no candidate promotion

### Existing Fund candidate identity/path reconciliation

The prior map recorded an apparent local candidate ID/path mismatch. Repairing
or rewriting those paths would mutate existing Fund artifacts, so it is not safe
under this goal.

Required next contract:

- read-only path and hash inventory
- explicit decision on whether local artifact repair is allowed

## P2 Gaps

### Route/package/replay/corpus direct verification

OS route packages and corpus audits are both implemented, but they are not one
single direct product contract. A future P2 integration test should prove:

`Route -> Domain Pack -> Public Package -> Manifest -> Replay -> Corpus Audit`

without depending on a discovery cycle.

### Package scout intake quality

Package scout exists but prior local evidence showed weak intake. Any fix would
change candidate intake behavior, so it was left untouched.

## P3 Gaps

The following remain underused relative to daemon candidate search:

- external production/reproduction
- frontier/reality/field grading
- general scientist service
- factory/open invention
- publication/autopublish governance
- plugin API
- external research/overnight operator

These are not blockers unless a future goal defines an exact artifact contract
and downstream consumer.

## Einstein/Nobel Gap

The system can assemble and gate a Fund-shaped package, but internal readiness
is still not the same as an externally reviewed scientific result. The remaining
scientific bottleneck is independent review quality, not a missing generic
architecture layer.
