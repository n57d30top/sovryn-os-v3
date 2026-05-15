# Reviewer Replay Quickcheck

This quickcheck gives an external reviewer a single machine-checkable replay command for the public package.

Run from this result directory:

```bash
node reviewer_replay_quickcheck.js
```

The quickcheck:

- reruns `node reproduce_second_survivor_benchmark.js` against public OpenML ARFF receipts;
- reads the regenerated `standalone_replay_results.json`;
- verifies the candidate ID, replay status, seven public replay rows, raw SHA-256 receipts, rounded Product metric tolerance, holdout/rival/negative-control statuses, and no-Fund/no-discovery-score contract;
- writes `reviewer_replay_quickcheck_result.json` and `REVIEWER_REPLAY_QUICKCHECK_RESULT.md`;
- exits nonzero if any required replay or no-overclaim condition fails.

Passing this quickcheck is public inspectability evidence only. It is not external validation and cannot create `FUND_FOUND`.
