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

## Dossier

Each invention has a typed dossier with technical field, problem, background,
proposed solution, architecture, algorithm, variants, advantages, limitations,
prior-art notes, safety notes, prototype path, tests path, license, publication
mode, and evidence hashes.

The generated content is a starting point. It must be reviewed if used in
serious research, commercial, legal, safety, or publication contexts.
