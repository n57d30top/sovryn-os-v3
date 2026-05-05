# Frontier Production Trial

The Frontier Production Trial combines the six roadmap slices into one bounded
scientific production run:

1. Build a verified benchmark expansion program.
2. Generate at least 1000 candidate method variants.
3. Implement the top 20 runnable candidates.
4. Run baseline-dominance falsification against at least six baselines.
5. Run independent replication variants for surviving candidates.
6. Build a paper-grade result package.
7. Update the knowledge engine.
8. Publish a curated corpus package only if gates pass.

The expected result is either a `replication_supported_candidate` or a
`strong_negative_result`. Both are valid scientific outputs. A negative result
is retained when strong baselines dominate most candidate methods.

The trial audit checks candidate counts, implemented prototypes, benchmark
tasks, baselines, replication variants, failures and losses, knowledge updates,
paper-package presence, public hygiene, no fake benchmark wins, no fake
breakthrough claims, and no unsupported scientific claims.
