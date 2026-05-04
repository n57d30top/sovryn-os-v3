# Beta Demo

This example mirrors the Alpha.26 beta-prep flow.

```bash
npm install
npm run build
node dist/cli.js init --json
node dist/cli.js beta demo --json
node dist/cli.js beta check --json
node dist/cli.js beta package --json
```

Expected outputs:

```text
.sovryn/beta/
  BETA_DEMO.md
  BETA_CHECK.md
  BETA_PACKAGE.md
  beta-demo.json
  beta-check.json
  beta-package.json
  package/
```

The beta package is a curated demo artifact. It excludes raw logs, secrets,
private config, local absolute paths, and legal patentability claims. Human
review is required before any real publication.
