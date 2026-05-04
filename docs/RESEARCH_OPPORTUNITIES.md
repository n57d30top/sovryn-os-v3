# Research Opportunities

The Research Opportunity Engine is Sovryn's Alpha.15 portfolio layer. It helps
Sovryn find and prioritize research goals before running the Autonomous Open
Research Factory.

It does not publish repositories. It does not file patents. It does not provide
legal novelty, patentability, or freedom-to-operate opinions. It produces
auditable queue evidence for Open Inventions, Defensive Publications, and Open
Source Research Artifacts.

## Commands

```bash
sovryn research scan --goal "Improve autonomous open-source research agents" --json
sovryn research queue build --goal "Improve autonomous open-source research agents" --json
sovryn research queue status --json
sovryn research queue run --max-runs 1 --json
sovryn research opportunity review <opportunity-id> --json
sovryn research morning-report --json
```

## Artifacts

```text
.sovryn/opportunities/
  opportunity-scan.json
  opportunity-candidates.json
  priority-ranking.json
  rejected-opportunities.json
  research-queue.json
  RESEARCH_QUEUE.md
  OPPORTUNITY_REPORT.md
  morning-report.json
  MORNING_REPORT.md
```

## Opportunity Inputs

The engine generates candidates from:

- user-supplied broad goals,
- existing Factory runs under `.sovryn/factory/`,
- existing Open Inventions under `.sovryn/inventions/`,
- weak `factory-score.json` signals,
- failed or blocking review gates,
- novelty gaps and counter-evidence,
- optional fixture or public-source search signals.
- optional corpus memory under `.sovryn/corpus/`.

Network access is not required for the deterministic path. Public-source
signals are only used when configured through `research.publicSearch` or
fixture mode.

Alpha.20 lets opportunity scans read `corpus-index.json` when present. Reusable
source-card evidence and duplicate-risk relationships can become `corpus`
signals, helping Sovryn reuse earlier work and avoid launching duplicate-like
research without review.

## Scoring

Each opportunity records:

- open-source value,
- evidence availability,
- novelty-gap strength,
- prototype feasibility,
- defensive-publication value,
- reproducibility potential,
- strategic fit,
- safety risk,
- legal/IP risk,
- duplicate risk,
- implementation complexity,
- source weakness.

The priority score normalizes these factors into `0..100`. Priority classes are:

- `A`: run now through Factory Mode,
- `B`: gather more evidence first,
- `C`: defer,
- `D`: blocked.

Blocked opportunities are not executed. Duplicate-like opportunities are not
silently discarded; they are scored and explained so humans can decide whether
the work is a meaningful continuation or a duplicate.

## Queue Execution

`sovryn research queue run` selects A-class opportunities up to `--max-runs` and
starts normal Factory runs. It records the Factory IDs in `research-queue.json`
and `morning-report.json`.

The queue never publishes. It cannot bypass Factory review, Open Invention
review, safety gates, secret scanning, replay checks, GitHub dry-run policy, or
human approval.

## Gates

Opportunity review reports these gates:

- `OPPORTUNITY_SCAN_PRESENT`
- `PRIORITY_RANKING_PRESENT`
- `RESEARCH_QUEUE_PRESENT`
- `NO_BLOCKED_OPPORTUNITY_EXECUTED`
- `SAFETY_RISK_BELOW_THRESHOLD`
- `DUPLICATE_RISK_REVIEWED`
- `FACTORY_RUN_BOUND_TO_OPPORTUNITY`
- `MORNING_REPORT_PRESENT`

These gates make the queue auditable. They are portfolio gates, not publication
gates.

## Config

```json
{
  "research": {
    "opportunities": {
      "enabled": true,
      "maxCandidates": 10,
      "minPriorityScore": 60,
      "maxQueueRuns": 3,
      "blockHighSafetyRisk": true,
      "allowSelfImprovementGoals": true,
      "preferSovrynSelfImprovement": true
    }
  }
}
```

Malformed values are clamped to safe defaults. High-safety-risk opportunities
are blocked by default.
