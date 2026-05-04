# Corpus Memory Demo

This demo shows the Alpha.20 memory layer that indexes previous Factory runs,
Open Inventions, source cards, duplicate-risk relationships, and release
metadata.

```bash
npm install
npm run build
node dist/cli.js init --json
node dist/cli.js factory run "Develop a method for verifiable autonomous open-source research agents" --mode autonomous --max-cycles 3 --json
node dist/cli.js factory publish-github <factory-id> --dry-run --json
node dist/cli.js corpus index --json
node dist/cli.js corpus search "verifiable agent evidence" --json
node dist/cli.js corpus dedupe --json
node dist/cli.js corpus report --json
node dist/cli.js release registry update --json
```

Expected local artifacts:

```text
.sovryn/corpus/
  corpus-index.json
  invention-registry.json
  source-registry.json
  duplicate-map.json
  feedback-index.json
  corpus-quality-report.json
  corpus-quality-report.md
  PUBLIC_RELEASES.md
```

The corpus is local research memory. It is not published automatically. The
public registry is a curated Open Invention registry, not a legal patent filing,
not a patentability opinion, and not a freedom-to-operate opinion.
