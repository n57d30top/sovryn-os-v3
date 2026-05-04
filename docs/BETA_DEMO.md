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

## Beta Operations

`3.0.0-beta.6` adds operational proof commands around the demo:

```bash
sovryn autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
sovryn autonomy campaign run --json
sovryn publication queue --json
sovryn benchmark research run --json
sovryn corpus api export --json
sovryn launch check --json
```

These commands write autonomy, publication-governance, benchmark, public corpus
API, and launch evidence. They prove repeatability and operational safety before
any real publication. Real GitHub publication remains disabled by default and
requires Sovryn publication gates plus human approval.
