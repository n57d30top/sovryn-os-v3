# Quality Evaluator Demo

This demo uses the Alpha.21 release-candidate workflow to seed Factory runs, then
uses the Alpha.22 Research Quality Evaluator.

```bash
npm install
npm run build
node dist/cli.js init --json
node dist/cli.js release candidates build --max 3 --json
node dist/cli.js quality report --json
node dist/cli.js quality leaderboard --json
node dist/cli.js quality evaluate <factory-id> --json
node dist/cli.js quality evaluate-invention <mission-id> --json
```

Generated artifacts:

```text
.sovryn/quality/
  evaluations/
  inventions/
  quality-report.json
  QUALITY_REPORT.md
  quality-leaderboard.json
  QUALITY_LEADERBOARD.md
  evaluator-rubric.json
  evaluator-findings.json
```

The evaluator checks artifact quality. It does not file patents, does not
provide legal novelty conclusions, and does not provide freedom-to-operate
opinions.
