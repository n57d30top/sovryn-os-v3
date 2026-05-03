# Open Invention Demo

This example shows the artifact shape produced by:

```bash
npm install
npm test
npm run build
node dist/cli.js invent-open "A method for verifiable open-source agent research"
node dist/cli.js factory-open "A factory for verifiable open-source invention research"
node dist/cli.js factory run "Develop a method for verifiable autonomous research agents" --json
node dist/cli.js node run alpha <mission-id> --mode autonomous --max-steps 25
node dist/cli.js invention review <mission-id>
node dist/cli.js publish-github <mission-id> --dry-run
```

In this repository the built CLI entrypoint is `dist/cli.js`.

Demo artifacts:

- `generated/dossier.json`
- `generated/DEFENSIVE_PUBLICATION.md`
- `generated/SOURCE_REVIEWS.md`
- `generated/RESEARCH_SYNTHESIS.md`
- `generated/prototype/`
- `generated/evidence/research-plan.json`
- `generated/evidence/public-source-search.json`
- `generated/evidence/source-readings.json`
- `generated/evidence/source-reviews.json`
- `generated/evidence/public/public-source-search.summary.json`
- `generated/evidence/public/source-readings.summary.json`
- `generated/evidence/command-journal.json`
- `generated/evidence/artifact-score.json`
- `generated/evidence/publication-review.json`
- `generated/evidence/publication-intent.json`
- `generated/evidence/github-publication.json`

Sovryn publishes Open Inventions and Defensive Publications. It does not file
legal patents.
