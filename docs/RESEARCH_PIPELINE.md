# Research Pipeline

Open Research Missions run deterministic phases in the MVP:

1. `brief`
2. `landscape_scan`
3. `prior_art_mapping`
4. `invention_synthesis`
5. `skeptic_review`
6. `prototype_build`
7. `verification`
8. `dossier_generation`
9. `publication_review`
10. `github_publication`

Each phase writes evidence to:

```text
.sovryn/inventions/<slug>/evidence/<phase>.json
```

Phase filenames use hyphens, for example `landscape-scan.json`,
`prior-art-mapping.json`, `publication-review.json`, and
`github-publication.json`. The typed phase names remain underscore-separated in
JSON for stable programmatic use.

Phase evidence includes status, timestamps, summary, artifacts, evidence hash,
and errors. The first implementation is template-based and deterministic. Future
providers may use external LLMs, local models, search APIs, browser automation,
or `sovryn-agentd`.

Internal roles are represented as modules: Scout, PriorArtMapper, Inventor,
Skeptic, Builder, DocWriter, and Publisher. Prior-art mapping is not a legal
conclusion.

The dossier includes a structured prior-art matrix with source type, URL,
overlap, difference, relevance, and citation fields. By default the MVP keeps
`invent-open` deterministic and fills this with mock public-source placeholders.

Sovryn also includes public-source search adapters for GitHub repositories,
OpenAlex works, arXiv papers, patent search links, standards/docs search links,
and general web search links. Enable them in `.sovryn/config.json`:

```json
{
  "research": {
    "publicSearch": {
      "enabled": true,
      "maxResultsPerSource": 3,
      "maxTotalResults": 30,
      "timeoutMs": 8000,
      "includeQueryLinks": true,
      "githubTokenEnv": null
    }
  }
}
```

Deep source reading is a separate opt-in layer. It reads concrete public-source
results through provider adapters and writes
`.sovryn/inventions/<slug>/evidence/source-readings.json`:

```json
{
  "research": {
    "sourceReading": {
      "enabled": true,
      "timeoutMs": 8000,
      "maxReadBytes": 20000,
      "githubTokenEnv": null
    }
  }
}
```

The first deep readers cover GitHub repository metadata/README, arXiv abstract
metadata, and OpenAlex work metadata including reconstructed inverted abstracts.
They still produce research evidence, not legal conclusions.

Factory Mode extends the pipeline with feature extraction, novelty-gap mapping,
candidate invention generation, selected-candidate dossier updates, and a
factory-readiness score. It writes `FACTORY_REPORT.md` and factory evidence
files under `evidence/`. Real publication is blocked when factory evidence is
present but weak.

The Autonomous Open Research Factory adds a factory-level pipeline:

1. `factory_plan`
2. `source_discovery`
3. `source_reading`
4. `feature_matrix`
5. `novelty_gap_analysis`
6. `candidate_generation`
7. `candidate_selection`
8. `invention_generation`
9. `prototype_build`
10. `test_generation`
11. `skeptic_review`
12. `factory_scoring`
13. `release_packaging`

These phases are recorded in `.sovryn/factory/<slug>/factory-run.json`. Each
phase either writes evidence or records degraded/blocked status. Factory runs
reuse Open Invention missions for selected candidates instead of duplicating the
dossier, prototype, test, safety, license, and publication-gate machinery.

Public-source search writes
`.sovryn/inventions/<slug>/evidence/public-source-search.json`. Retrieved
results are technical research leads, not legal prior-art conclusions.

Each result has a quality kind:

- `concrete_source`: a concrete repository, paper, or other retrieved source
- `query_link`: a search URL that still needs source inspection
- `adapter_failure`: a failed source query recorded as degraded evidence
- `mock_placeholder`: deterministic MVP placeholder evidence

The evidence file records `status`, concrete/link/failure/mock counts, and the
successful, failed, and query-link source types.

Node Alpha autonomous mode adds a `public_research_review` phase. It reads the
public-source-search evidence and writes:

```text
.sovryn/inventions/<slug>/evidence/source-reviews.json
.sovryn/inventions/<slug>/SOURCE_REVIEWS.md
.sovryn/inventions/<slug>/RESEARCH_SYNTHESIS.md
```

Concrete sources are reviewed at metadata level, or at deep-source level when a
matching source reading is available. Query links are marked as unreviewed
research leads. Adapter failures are marked for retry/manual review. Mock
placeholders remain deterministic MVP placeholders. The phase also updates
`PRIOR_ART.md`, `NOVELTY_NOTES.md`, `evidence/skeptic-review.md`, and
`evidence/artifact-score.json`.

Publication review binds this evidence back to the dossier. Sovryn verifies
that `dossier.evidenceHashes.public_source_search` matches the evidence file's
hash, that the file hash is internally valid, and that the dossier's
prior-art matrix matches the evidence results. Unknown or missing prior-art
`kind` values are invalid; they do not fall back to deterministic placeholders.

Release packages include only a curated
`evidence/public/public-source-search.summary.json` with source titles, URLs,
citations, kinds, source types, relevance, and aggregate counts. Raw adapter
errors and private local execution details are not copied into public evidence.
When present, `evidence/source-reviews.json`, `SOURCE_REVIEWS.md`, and
`RESEARCH_SYNTHESIS.md` are also staged as public research artifacts. Source
readings are published as a curated
`evidence/public/source-readings.summary.json`.
