# Beta Demo

The beta demo proves the end-to-end product path with deterministic,
fixture-backed evidence:

```bash
node dist/cli.js init --json
node dist/cli.js beta demo --json
node dist/cli.js beta check --json
node dist/cli.js beta package --json
```

The demo runs release-candidate generation, Factory evidence creation, Quality
evaluation, public corpus export, static corpus shell generation, Security
audit, Reliability audit, and curated beta packaging.

Generated artifacts:

```text
.sovryn/beta/
  beta-demo.json
  beta-check.json
  beta-package.json
  BETA_DEMO.md
  BETA_CHECK.md
  BETA_PACKAGE.md
  package/
```

The package is a public demo bundle, not a real publication. Human review is
required before any GitHub publication. Sovryn does not file legal patents and
does not provide legal novelty, patentability, or freedom-to-operate opinions.
