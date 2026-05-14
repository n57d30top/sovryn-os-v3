# Baseline Dominance Results

| Baseline                                       | Metric | Explains signal |
| ---------------------------------------------- | -----: | --------------- |
| majority/simple baseline from memory-gated run |  0.641 | false           |
| stronger temporal persistence baseline         |  0.735 | false           |
| group-proxy holdout baseline                   |  0.694 | false           |

## Kill-week baseline attacks

- stronger temporal baseline: weakened. Persistence/cadence baseline narrows the random-vs-holdout residual from 0.088 to 0.041; not baseline dominated, but margin is thinner.
- simple baseline dominance check: survived. Majority/simple baseline remains below candidate metric and does not fully explain the signal.
