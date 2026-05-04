# Autonomous Overnight Operator

Alpha.23 adds an overnight operating mode for Sovryn OS.

```bash
sovryn overnight plan --goal "Improve autonomous open-source research agents" --json
sovryn overnight run --goal "Improve autonomous open-source research agents" --max-hours 8 --max-runs 1 --json
sovryn overnight status --json
sovryn overnight report --json
sovryn overnight stop --json
```

The operator coordinates existing systems:

- Research Opportunity Engine
- Factory Mode
- Research Quality Evaluator
- Factory improve and replay
- Worker execution evidence
- Corpus Memory
- curated Factory public packaging

It does not publish to GitHub. Real publication remains controlled by Sovryn
Controller, Open Invention finalization, publication policy, secret scanning,
safety review, and human approval.

## Artifacts

```text
.sovryn/overnight/
  overnight-plan.json
  overnight-plan.md
  overnight-run.json
  overnight-events.jsonl
  overnight-budget.json
  overnight-decisions.json
  overnight-results.json
  OVERNIGHT_REPORT.md
  MORNING_BRIEF.md
```

The JSONL event stream is redacted and contains operator events only. It does
not include raw command stdout, stderr, command journals, private config, or
tokens.

## Gates

Overnight gates include:

- `OVERNIGHT_PLAN_PRESENT`
- `OVERNIGHT_BUDGET_ENFORCED`
- `NO_BLOCKED_OPPORTUNITY_EXECUTED`
- `QUALITY_EVALUATION_BOUND`
- `WORKER_EXECUTION_BOUND`
- `CORPUS_UPDATED`
- `MORNING_BRIEF_PRESENT`
- `NO_REAL_PUBLICATION_DURING_OVERNIGHT`

These are coordination gates. They do not replace Factory gates, Quality gates,
Worker gates, Open Invention publication gates, or human review.

## Budget

The operator records:

- max hours,
- max Factory runs,
- max improve cycles,
- max worker executions,
- max network calls,
- disk usage estimate.

The Alpha implementation is deterministic and bounded. It stops or degrades when
safety risk, worker failures, or budget violations are detected.

## Scope

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. Overnight reports are research operations evidence. They are
not legal patent filings, patentability opinions, legal novelty opinions, or
freedom-to-operate opinions.
