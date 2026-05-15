# Independent Reproducer Package

## Candidate

DISCOVERY-BENCH-TRIAGE-SECOND-INDEPENDENT-SURVIVOR-001

## Required Commands

Standalone public replay and reviewer quickcheck:

```bash
node reproduce_second_survivor_benchmark.js
node reviewer_replay_quickcheck.js
```

Product replay:

```bash
sovryn discover-daemon second-independent-survivor --live-openml --json
sovryn discover-daemon second-survivor-fund-draft --json
sovryn discover-daemon second-survivor-methodology-evidence --json
```

## Public Tasks

| Claim                     | Task | Dataset   | Data receipt                               | Raw ARFF receipt                                        |
| ------------------------- | ---: | --------- | ------------------------------------------ | ------------------------------------------------------- |
| SA-PLAUS-003-OPENML-32    |   32 | pendigits | https://www.openml.org/api/v1/json/data/32 | https://openml.org/data/v1/download/32/pendigits.arff   |
| SECOND-SURV-001-OPENML-59 |   59 | iris      | https://www.openml.org/api/v1/json/data/61 | https://openml.org/data/v1/download/61/iris.arff        |
| SECOND-SURV-003-OPENML-7  |    7 | audiology | https://www.openml.org/api/v1/json/data/7  | https://openml.org/data/v1/download/7/audiology.arff    |
| SECOND-SURV-005-OPENML-53 |   53 | vehicle   | https://www.openml.org/api/v1/json/data/54 | https://openml.org/data/v1/download/54/vehicle.arff     |
| SECOND-SURV-006-OPENML-36 |   36 | segment   | https://www.openml.org/api/v1/json/data/36 | https://openml.org/data/v1/download/36/segment.arff     |
| SECOND-SURV-007-OPENML-43 |   43 | spambase  | https://www.openml.org/api/v1/json/data/44 | https://openml.org/data/v1/download/44/spambase.arff    |
| SECOND-SURV-008-OPENML-15 |   15 | breast-w  | https://www.openml.org/api/v1/json/data/15 | https://openml.org/data/v1/download/52350/breast-w.arff |

## Expected Outputs

- Seven public raw replay survivor rows.
- Reviewer quickcheck result with `passed=true` only when public raw replay reruns, all survivor rows remain within Product rounding tolerance, and the package still records `fundFound=false`.
- Baseline, holdout, rival, and negative-control tables.
- Methodology value tests showing bounded value but no external validation.
- No FUND_FOUND.md unless a future strict discovery-scored Fund Gate allows notification.
