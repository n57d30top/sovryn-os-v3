# OpenML-32 Concentration Analysis

OpenML-32 rows parsed: 9
OpenML-32 rows selected: 9
OpenML-32 plausible non-control selected: 7

## Root Cause

- The mixed 50-claim benchmark overrepresented OpenML-32 in the plausible class.
- V1 counted same-mechanism recurrence by rows, not by independent OpenML task IDs.
- Model-vs-baseline and random-vs-holdout components rewarded repeated variants from the same task.
- Positive-control retention proved V1 was not reject-all, but did not prove independent plausible non-control support.

## V2 Repair

V2 counts recurrence by unique OpenML task IDs, suppresses repeated same-task plausible variants, and blocks DiscoveryCandidate promotion unless at least two plausible non-control claims survive from at least two independent tasks.
