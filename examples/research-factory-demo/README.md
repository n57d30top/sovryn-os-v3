# Research Factory Demo

Run from the repository root:

```bash
npm install
npm test
npm run build
node dist/cli.js init
node dist/cli.js factory run "Develop a method for verifiable autonomous research agents" --json
node dist/cli.js factory status <factory-id> --json
node dist/cli.js factory review <factory-id> --json
node dist/cli.js factory package <factory-id> --json
```

The demo creates `.sovryn/factory/<slug>/` and at least one generated Open
Invention mission under `.sovryn/inventions/<slug>/`. Default config is
deterministic and uses mock prior-art placeholders unless public search is
enabled. The factory report and limitations report state that the output is an
open-source research artifact, not a legal patent filing or patentability
opinion.
