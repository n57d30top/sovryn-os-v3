# Reproducer Checklist

- [ ] Clone the Product repo and install dependencies.
- [ ] Run `npm test` to confirm the local environment.
- [ ] Run `sovryn discover-daemon second-independent-survivor --live-openml --json`.
- [ ] Confirm every listed OpenML task/data receipt loads.
- [ ] Confirm deterministic split construction is documented.
- [ ] Recompute majority baseline, random split metric, holdout metric, and shuffled-target control.
- [ ] Compare generated tables against `BASELINES.md`, `HOLDOUT_REPLAY.md`, and `NEGATIVE_CONTROLS.md`.
- [ ] Decide whether the method has benchmark-methodology value beyond replay mechanics.
- [ ] Record any failed task as a downgrade; do not infer external validation from package presence.

Current survivor tasks to check: OpenML-32, OpenML-59, OpenML-7, OpenML-53, OpenML-36, OpenML-43, OpenML-15.
