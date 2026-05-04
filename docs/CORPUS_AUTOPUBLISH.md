# Corpus Autopublish

Corpus autopublish writes eligible results into the existing public corpus repo
only. It does not create new GitHub repositories.

Dry-run:

```bash
node dist/cli.js corpus autopublish --target-repo <sovryn-open-inventions-path> --dry-run --json
```

Audit:

```bash
node dist/cli.js corpus publish-audit --target-repo <sovryn-open-inventions-path> --json
node dist/cli.js corpus site audit --target-repo <sovryn-open-inventions-path> --json
```

Autopublish can skip human review for corpus entries, but automated gates remain
mandatory:

- quality and evidence thresholds,
- replay-critical pass rate,
- safety scan,
- reliability replay,
- security audit,
- public hygiene scan,
- no raw logs,
- no secrets,
- no local absolute paths,
- no fake legal claims.

`npm run demo:public-beta` uses dry-run publication only and does not push.
