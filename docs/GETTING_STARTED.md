# Getting Started

Sovryn OS v3 is an autonomous open-source research factory for evidence-bound
Open Inventions, Defensive Publications, prototypes, tests, and public research
artifacts.

```bash
npm install
npm run build
npm test
node dist/cli.js init --json
node dist/cli.js factory run "Develop a method for verifiable autonomous research agents" --json
node dist/cli.js factory review <factory-id> --json
```

For the product demo path:

```bash
node dist/cli.js beta demo --json
node dist/cli.js beta check --json
node dist/cli.js beta package --json
```

For the Beta.6 operational path:

```bash
node dist/cli.js autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
node dist/cli.js autonomy campaign run --json
node dist/cli.js publication queue --json
node dist/cli.js benchmark research run --json
node dist/cli.js corpus api export --json
node dist/cli.js launch check --json
```

Sovryn is not a legal patent filing system and does not provide legal novelty,
patentability, or freedom-to-operate opinions.
