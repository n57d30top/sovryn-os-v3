# Open Invention Demo

This example shows the artifact shape produced by:

```bash
npm install
npm test
npm run build
node dist/cli.js invent-open "A method for verifiable open-source agent research"
node dist/cli.js node run alpha <mission-id> --mode autonomous --max-steps 25
node dist/cli.js invention review <mission-id>
node dist/cli.js publish-github <mission-id> --dry-run
```

In this repository the built CLI entrypoint is `dist/cli.js`.

Demo artifacts:

- `generated/dossier.json`
- `generated/DEFENSIVE_PUBLICATION.md`
- `generated/prototype/`
- `generated/evidence/research-plan.json`
- `generated/evidence/command-journal.json`
- `generated/evidence/artifact-score.json`
- `generated/evidence/publication-review.json`
- `generated/evidence/publication-intent.json`
- `generated/evidence/github-publication.json`

Sovryn publishes Open Inventions and Defensive Publications. It does not file
legal patents.
