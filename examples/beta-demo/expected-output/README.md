# Expected Output

The beta demo creates a local `.sovryn/beta/package/` directory containing only
curated summaries and reports:

- `BETA_CHECK.md`
- `BETA_DEMO.md`
- `BETA_PACKAGE.md`
- `beta-check.summary.json`
- `beta-demo.summary.json`
- `security-audit.summary.json`
- `reliability-audit.summary.json`
- `quality-report.summary.json`
- `public-corpus.summary.json`
- `release-candidates.summary.json`

Raw stdout/stderr, command journals, private config, secrets, local absolute
paths, and full raw source content should not appear in this package.
