# Getting Started: Public Beta

Sovryn OS is an autonomous open-source research factory for evidence-bound Open
Inventions, Defensive Publications, prototypes, tests, quality reports, and
public corpus artifacts.

It is not a patent filing system, patentability opinion, legal novelty opinion,
or freedom-to-operate opinion.

## Quick Path

```bash
npm install
npm run build
node dist/cli.js --help
node dist/cli.js public-beta check --json
npm run demo:public-beta
```

The public beta demo creates a temporary repository, runs a safe fixture-backed
external research flow, validates the generated prototype through Node Alpha
when available, and prepares corpus autopublish as a dry-run only. It does not
push to GitHub by default.

## What To Inspect

- `.sovryn/public-beta/PUBLIC_BETA_READINESS.md`
- `.sovryn/public-beta/PUBLIC_BETA_DEMO_REPORT.md`
- `.sovryn/public-beta/public-beta-check.json`
- `.sovryn/public-beta/public-beta-demo.json`

Before any real corpus publication, run corpus publish and site audits against
the target corpus repo.
