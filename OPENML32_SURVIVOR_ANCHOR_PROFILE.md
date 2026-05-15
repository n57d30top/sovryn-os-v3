# OpenML-32 Survivor Anchor Profile

Anchor claim: SA-PLAUS-003-OPENML-32
Task: 32
Dataset: pendigits
Replay classification: replay_passed
Rows / features: 10992 / 16
Split protocol: input1_bucket / first public ARFF feature holdout

## Why It Passed

- model-vs-baseline=0.093 with baseline=0.094
- rival=scoped_or_weakened; holdout=survived; random-vs-holdout=0.187
- negative-control=0.106; behaved=yes

## Survival-Predictive Features

- concrete OpenML task and data receipt
- first-feature group-style holdout is reconstructible from raw ARFF
- random split margin remains above majority baseline
- stronger holdout reduces the random split signal enough to expose protocol fragility
- shuffled-target negative control stays below the real-label replay margin
- rival mechanism is scoped by live raw replay rather than deterministic proxy metrics
