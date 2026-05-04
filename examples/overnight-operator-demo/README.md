# Overnight Operator Demo

This demo shows the Alpha.23 overnight coordination flow.

```bash
npm install
npm run build
mkdir -p /tmp/sovryn-overnight-demo
cd /tmp/sovryn-overnight-demo
git init -b main
git config user.name "Demo User"
git config user.email demo@example.com
printf '{"scripts":{"test":"node -e \"process.exit(0)\""}}\n' > package.json
git add -A
git commit -m initial
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js init --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js overnight run --goal "Improve autonomous open-source research agents" --max-hours 8 --max-runs 1 --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js overnight status --json
node /Users/sovryn/Desktop/sovryn-os-v3/dist/cli.js overnight report --json
```

Expected local artifacts:

```text
.sovryn/overnight/
  overnight-plan.json
  overnight-run.json
  overnight-events.jsonl
  overnight-budget.json
  overnight-decisions.json
  overnight-results.json
  OVERNIGHT_REPORT.md
  MORNING_BRIEF.md
```

The demo runs the Research Opportunity Engine, starts a bounded Factory run,
evaluates quality, runs a bounded improve cycle when quality is weak, replays
evidence, updates corpus memory, and writes a morning brief.

It does not perform real GitHub publication and does not claim legal
patentability, legal novelty, or freedom to operate.
