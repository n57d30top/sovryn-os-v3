# Public Beta Demo

This example describes the one-command public beta proof path.

```bash
npm install
npm run build
npm run demo:public-beta
```

The demo creates a temporary repository, runs the safe `energy-record-auditor`
external research fixture, records Node Alpha validation evidence, and prepares
corpus autopublish as a dry-run only.

Expected local artifacts:

```text
.sovryn/public-beta/
  public-beta-check.json
  public-beta-demo.json
  PUBLIC_BETA_READINESS.md
  PUBLIC_BETA_DEMO_REPORT.md
```

The demo does not push to GitHub and does not create standalone repositories.
It is not a patent filing, patentability opinion, legal novelty opinion, or
freedom-to-operate opinion.
