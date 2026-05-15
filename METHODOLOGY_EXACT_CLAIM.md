# Methodology Exact Claim

## Product Claim Preserved

A receipt-first benchmark triage method can identify OpenML benchmark claims whose random-split performance survives public raw replay as a bounded protocol-fragility signal across OpenML-32 and at least one independent task, with nonfatal baseline, holdout, rival, and negative-control checks.

## Bounded Reviewer-Facing Interpretation

On the seven listed public OpenML tasks (OpenML-32, OpenML-59, OpenML-7, OpenML-53, OpenML-36, OpenML-43, OpenML-15), the receipt-first benchmark triage method retains candidate claims only when concrete task/data receipts, deterministic replay, baseline comparison, holdout/protocol-fragility checks, rival closure, and negative controls all remain nonfatal.

The bounded methodology claim is that this triage rule produces a more reviewable survivor set than source-family-only evidence or reject-all behavior, because it keeps at least two independent public-raw replay survivors while rejecting claims without receipts, replay paths, or nonfatal controls.

## What It Does Not Claim

- No external validation.
- No external adoption.
- No Nobel, Einstein-level, breakthrough, legal, medical, wet-lab, unsafe, or universal-truth claim.
- No broad theorem about OpenML, benchmark leakage, or all random-vs-holdout splits.
- No claim that every listed task has semantic group, time, or entity leakage.

## Why Seven Independent Survivor Tasks Matter

Seven replay-closed tasks matter because they turn the method from a single-task artifact into a bounded multi-task review target. The current closure has 7/7 closed tasks and 7 independent task IDs.

## Value Beyond Replay

The value beyond replay is not that the pipeline runs. The value is a reviewable selection rule: it refuses source-family-only evidence, requires public receipts and negative controls, and retains a bounded survivor set that an external reviewer can rerun.
