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

## Public Beta Demo

Beta.22 adds a one-command public beta demo:

```bash
npm run demo:public-beta
```

The command builds the CLI, creates a temporary repository, runs a small safe
external research fixture, validates with Node Alpha when available, and
prepares corpus autopublish as a dry-run only. It writes
`.sovryn/public-beta/PUBLIC_BETA_DEMO_REPORT.md` and does not push to GitHub.

## Beta Operations

`3.0.0-beta.22` includes the operational proof commands, corpus lifecycle
curation, and real-source external campaign path around the demo:

```bash
sovryn autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
sovryn autonomy campaign run --json
sovryn publication queue --json
sovryn benchmark research run --json
sovryn corpus api export --json
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn external-research campaign real-sources --domains 3 --fixture-sources --json
sovryn launch check --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
sovryn e2e run --profile beta-fixture --release-candidates 3 --json
sovryn overnight run --goal "Generate safe external open inventions" --max-runs 3 --autopublish-corpus --json
sovryn launch v1-rc-check --json
```

These commands write autonomy, publication-governance, benchmark, public corpus
API, launch, pilot-release-candidate, E2E validation, overnight external trial,
and v1-RC gate evidence. Real standalone GitHub publication remains disabled by
default; corpus autopublish is restricted to the existing public corpus repo and
still requires automated gates.
