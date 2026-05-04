# Open Inventions

Sovryn OS treats inventions as open-source research artifacts. The product goal
is: invent, implement, publish, keep it open.

Sovryn does not file legal patents. It produces Open Inventions, Defensive
Publications, and Open Source Research Artifacts. Public publication may affect
patent rights, so serious contexts require qualified human and legal review
before release.

## Mission Flow

```bash
sovryn invent-open "A method for self-verifying autonomous research agents"
sovryn node run alpha <mission-id> --mode autonomous --max-steps 25
sovryn invention review <mission-id>
sovryn invention finalize <mission-id>
sovryn publish-github <mission-id> --org sovryn-inventions --repo self-verifying-research-agents
```

The deterministic MVP creates `.sovryn/inventions/<slug>/` with a dossier,
defensive publication, prior-art notes, safety review, prototype, tests,
evidence, and release staging area. The MVP does not depend on an LLM API.

## Public-Source Research

Open Invention missions default to deterministic prior-art placeholders. To
let Sovryn query public sources during dossier generation, enable
`research.publicSearch.enabled` in `.sovryn/config.json`. The built-in adapters
cover GitHub repository search, OpenAlex works, arXiv papers, patent search
links, standards/docs search links, and general web search links. Public-source
config includes result limits and per-request timeouts so external APIs cannot
hold a mission open indefinitely.

The output is written to `evidence/public-source-search.json` and folded into
the prior-art matrix. Results are marked as `concrete_source`, `query_link`,
`adapter_failure`, or `mock_placeholder`. Query links alone are not treated as
concrete prior-art evidence. Publication review verifies that the dossier's
matrix is bound to the hashed evidence file. Strict real publication can also
require concrete sources instead of deterministic placeholders. These results
are research leads only. Sovryn does not make legal novelty, patentability, or
freedom-to-operate conclusions.

Alpha.17 adds robust public-source research support for real runs. Source
discovery can write a TTL cache under `.sovryn/research-cache/`, retry transient
adapter failures, replay from cache when `research.publicSearch.offlineReplay`
is enabled, deduplicate repeated URLs, and report adapter health, source quality,
dedupe, and rate-limit events under `.sovryn/adapters/`.

```bash
sovryn factory run "Develop a method for verifiable autonomous research agents" --real-sources --json
sovryn research adapters doctor --json
sovryn research cache status --json
sovryn research cache prune --json
```

Cached and replayed results remain evidence about the discovery process, not a
legal prior-art conclusion. Query links, failures, and placeholders are still
weak/degraded evidence and do not count as reviewed concrete sources.

When Node Alpha runs in autonomous mode, it reads this evidence during the
`public_research_review` phase. It creates source-review evidence and updates
the dossier's research artifacts without pretending that query links, adapter
failures, or deterministic placeholders are reviewed sources.

Deep source reading is optional and separate from discovery. When
`research.sourceReading.enabled` is true, Sovryn reads supported concrete
sources before Node Alpha review: GitHub repository README/metadata,
arXiv abstract metadata, and OpenAlex work metadata. The resulting
`evidence/source-readings.json` can upgrade Node Alpha reviews from
`reviewed_metadata` to `reviewed_deep_source`.

Factory Mode is available through `sovryn factory-open "<research-goal>"`. It
creates an Open Invention mission, extracts features, maps novelty gaps,
generates candidate inventions, selects one, updates the dossier, writes a
factory report, scores evidence strength, and blocks weak real publication.

The newer Autonomous Open Research Factory is available through
`sovryn factory run "<research-goal>"`. It creates a factory run under
`.sovryn/factory/<slug>/`, builds a research plan, source-discovery evidence,
source readings, feature matrix, novelty-gap map, candidate inventions,
selected candidates, factory score, `FACTORY_REPORT.md`, and `LIMITATIONS.md`.
It then triggers normal Open Invention missions for selected candidates. The
factory reuses the same publication philosophy: agents act, Sovryn verifies,
evidence persists, and weak or stale research is blocked by gates.

Factory Alpha.14 adds a strict evidence path for runs that should behave more
like real public-source research. Enable:

```json
{
  "research": {
    "publicSearch": {
      "enabled": true
    },
    "sourceReading": {
      "enabled": true
    },
    "factory": {
      "strictEvidenceMode": true,
      "minConcreteSources": 1,
      "minConcreteSourcesRead": 1,
      "minEvidenceStrengthScore": 60,
      "minReproducibilityScore": 60,
      "minReadingDepthScore": 40,
      "minClaimMappingScore": 50,
      "minNoveltyRiskScore": 50
    }
  }
}
```

In strict mode, Sovryn blocks runs with no concrete sources, no concrete source
readings, weak evidence scores, weak reproducibility scores, missing prototypes,
missing tests, stale hashes, missing source cards, missing claim/feature matrix,
missing counter-evidence, missing experiment plans, or missing curated release
evidence. Query links, adapter failures, and mock placeholders remain visible
but never count as reviewed prior art.

For deterministic tests and demos, set `research.publicSearch.fixtureMode` and
`research.sourceReading.fixtureMode` to true. Fixture mode uses representative
concrete GitHub/paper sources, patent and standards query links, and an adapter
failure without making network calls.

Strict factory runs also write:

- `source-cards/<source-id>.json` and `.md`
- `CLAIM_FEATURE_MATRIX.md`
- `COUNTER_EVIDENCE.md`
- `EXPERIMENT_PLAN.md`
- `BENCHMARK_PLAN.md`
- `NOVELTY_GAP_REPORT.md`
- `REPLAY_REPORT.md`
- `candidate-selection-rationale.md`
- `execution/prototype-execution.json`
- `release/public/` curated summaries

The claim/feature matrix and novelty gap report use careful language such as
"possible differentiator" and "candidate novelty axis." They are research
artifacts only, not legal claims or patentability opinions.

Alpha.14 source readings record bounded reading depth:
`metadata_only`, `abstract_level`, `readme_level`, `code_structure_level`,
`paper_fulltext_level`, `patent_claim_level`, `unavailable`, or `failed`.
GitHub fixture/live readers can summarize code structure and implementation
hints; arXiv and OpenAlex readers remain bounded to abstract/metadata unless a
future fulltext provider is configured; patent sources have a structured
claim-like model but no legal claim construction.

Alpha.18 adds factory-level paper reading, patent claim-like reading, and
source-to-claim mapping artifacts. `paper-readings.json`,
`patent-claim-readings.json`, and `claim-element-map.json` are hash-bound to the
Factory run and can be packaged as curated public summaries. The corresponding
`SOURCE_TO_CLAIM_MAP.md` and `PATENT_RISK_NOTES.md` reports are research aids
only. They do not assert patentability, legal novelty, claim construction, or
freedom-to-operate.

Alpha.19 adds secure worker runtime evidence for validating generated
prototypes. `container-netoff` requests Docker/Podman execution with
`--network none`, prototype-only workspace handling, and resource-limit intent.
If the runtime is unavailable, Sovryn writes unavailable evidence and does not
fall back to host execution. Worker reports are local evidence under
`.sovryn/workers/` and document assurance, network policy, filesystem mount
intent, resource limits, policy rules, and supply-chain risk.

`sovryn factory improve <factory-id>` runs deterministic improvement cycles
from existing evidence. `sovryn factory replay <factory-id>` recomputes score
and gates without network calls, verifies hashes, and writes replay evidence.
`sovryn factory publish-github <factory-id> --dry-run` packages curated factory
evidence and routes publication through the generated Open Invention mission.
Real GitHub publication remains gated by Sovryn Controller.

## Research Opportunities

Alpha.15 adds a Research Opportunity Engine that helps Sovryn decide what to
research next. It does not publish and it does not make legal novelty claims.
It scans a broad goal, existing Factory runs, generated Open Inventions, weak
factory scores, novelty gaps, counter-evidence, and optional public-source or
fixture signals. It then scores and prioritizes opportunities that could become
useful, safe, evidence-backed Open Inventions.

```bash
sovryn research scan --goal "Improve autonomous open-source research agents" --json
sovryn research queue build --goal "Improve autonomous open-source research agents" --json
sovryn research queue run --max-runs 1 --json
sovryn research morning-report --json
```

The queue writes `.sovryn/opportunities/research-queue.json` and
`RESEARCH_QUEUE.md`. Queue execution starts selected Factory runs and records
the resulting Factory IDs in `morning-report.json` and `MORNING_REPORT.md`.
Blocked opportunities are never executed, B/C-class opportunities are deferred,
and duplicate-like work is flagged with rationale rather than hidden.

This is the portfolio-management layer for the open research factory. It still
uses the same publication philosophy: agents act, Sovryn verifies, evidence
persists, policy gates block weak or unsafe work, and humans approve public
release.

## Corpus Memory

Alpha.20 adds local corpus memory:

```bash
sovryn corpus index --json
sovryn corpus search "verifiable agent evidence" --json
sovryn corpus dedupe --json
sovryn release registry update --json
```

The corpus indexes Factory runs, generated Open Inventions, concrete source
cards, duplicate-risk relationships, dry-run release packages, and public
release metadata. Future opportunity scans can use corpus signals to reduce
duplicate work and reuse source evidence. The corpus is local by default and is
not published automatically. Its `PUBLIC_RELEASES.md` registry is an
open-source research registry, not a legal patent filing or legal novelty
opinion.

## Release Candidates

Alpha.21 adds a release-candidate workflow for producing human-reviewable Open
Invention release candidates from the existing Factory, dry-run publication,
worker execution, replay, corpus, and registry layers.

```bash
sovryn release candidates build --max 3 --json
sovryn release candidates review --json
sovryn release candidates package --json
```

The workflow creates up to three fixture-backed strong research runs for:

- verifiable autonomous research agents,
- evidence-bound source-card trust scoring,
- container-isolated prototype validation for research agents.

Each candidate binds a Factory run, generated Open Invention mission, curated
public Factory release, publication intent, corpus duplicate review, prototype
execution evidence, replay evidence, and release-readiness score. The package is
written under `.sovryn/releases/candidates/public/` and includes only curated
public evidence. It does not copy raw command logs, stdout/stderr, secrets,
private config, or legal patentability claims.

Release candidates are not automatic public releases. They are a review queue
for Open Inventions that may later be finalized and published through Sovryn's
existing publication gates.

## Research Quality

Alpha.22 adds a Research Quality Evaluator:

```bash
sovryn quality evaluate <factory-id> --json
sovryn quality evaluate-invention <mission-id> --json
sovryn quality compare <factory-id-a> <factory-id-b> --json
sovryn quality report --json
sovryn quality leaderboard --json
```

The evaluator grades source quality, reading depth, claim mapping,
counter-evidence, novelty-risk honesty, prototype relevance, tests,
reproducibility, safety review, publication clarity, corpus uniqueness, and
defensive-publication value. It writes `.sovryn/quality/quality-report.json`,
`QUALITY_REPORT.md`, `quality-leaderboard.json`, `QUALITY_LEADERBOARD.md`,
`evaluator-rubric.json`, and `evaluator-findings.json`.

Quality evaluation is a deterministic artifact-quality review. It can block a
release candidate from being marked publish-ready when evidence is weak, tests
are trivial, counter-evidence is missing, or publication language is unsafe. It
is not a legal novelty, patentability, or freedom-to-operate opinion.

## Dossier

Each invention has a typed dossier with technical field, problem, background,
proposed solution, architecture, algorithm, variants, advantages, limitations,
prior-art notes, safety notes, prototype path, tests path, license, publication
mode, and evidence hashes.

The generated content is a starting point. It must be reviewed if used in
serious research, commercial, legal, safety, or publication contexts.
