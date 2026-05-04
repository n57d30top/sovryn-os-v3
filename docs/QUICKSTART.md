# Quickstart

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js public-beta check --json
npm run demo:public-beta
```

Useful follow-up commands:

```bash
node dist/cli.js external-research run energy-record-auditor --profile container-netoff --fixture-install --json
node dist/cli.js corpus autopublish --target-repo <sovryn-open-inventions-path> --dry-run --json
node dist/cli.js corpus site audit --target-repo <sovryn-open-inventions-path> --json
node dist/cli.js launch v1-rc-check --target-repo <sovryn-open-inventions-path> --json
```

The dry-run path prepares publication evidence without creating a new GitHub
repository and without requiring a GitHub token.
