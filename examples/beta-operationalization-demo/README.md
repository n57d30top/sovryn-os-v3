# Beta Operationalization Demo

This example shows the `3.0.0-beta.6` operations path after Alpha.26.

```bash
npm install
npm run build
mkdir -p /tmp/sovryn-beta6-demo
cd /tmp/sovryn-beta6-demo
git init
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js init --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js release candidates build --max 1 --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js autonomy campaign run --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js publication queue --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js benchmark research run --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js corpus api export --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js launch check --json
```

Expected artifact roots:

```text
.sovryn/autonomy/
.sovryn/publication/
.sovryn/workers/alpha/
.sovryn/benchmarks/
.sovryn/launch/
public-corpus/api/
```

The demo prepares Open Invention and publication-governance evidence. It does
not perform real GitHub publication and does not expose GitHub credentials.
Sovryn does not file legal patents or provide legal novelty, patentability, or
freedom-to-operate opinions.
