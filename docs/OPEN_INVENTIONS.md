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

Factory Alpha.13 adds a strict evidence path for runs that should behave more
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
      "minReproducibilityScore": 60
    }
  }
}
```

In strict mode, Sovryn blocks runs with no concrete sources, no concrete source
readings, weak evidence scores, weak reproducibility scores, missing prototypes,
missing tests, stale hashes, missing source cards, missing claim/feature matrix,
or missing curated release evidence. Query links, adapter failures, and mock
placeholders remain visible but never count as reviewed prior art.

For deterministic tests and demos, set `research.publicSearch.fixtureMode` and
`research.sourceReading.fixtureMode` to true. Fixture mode uses representative
concrete GitHub/paper sources, patent and standards query links, and an adapter
failure without making network calls.

Strict factory runs also write:

- `source-cards/<source-id>.json` and `.md`
- `CLAIM_FEATURE_MATRIX.md`
- `NOVELTY_GAP_REPORT.md`
- `candidate-selection-rationale.md`
- `execution/prototype-execution.json`
- `release/public/` curated summaries

The claim/feature matrix and novelty gap report use careful language such as
"possible differentiator" and "candidate novelty axis." They are research
artifacts only, not legal claims or patentability opinions.

## Dossier

Each invention has a typed dossier with technical field, problem, background,
proposed solution, architecture, algorithm, variants, advantages, limitations,
prior-art notes, safety notes, prototype path, tests path, license, publication
mode, and evidence hashes.

The generated content is a starting point. It must be reviewed if used in
serious research, commercial, legal, safety, or publication contexts.
