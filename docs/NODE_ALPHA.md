# Node Alpha

Node Alpha is Sovryn's dedicated Linux research machine concept. It is the
agent's working machine for legitimate research, software development,
prototyping, documentation, benchmarking, and preparation of open-source
research artifacts.

For the MVP, Node Alpha runs locally through the shell adapter:

```bash
sovryn node register alpha --host local
sovryn node status alpha
sovryn node run alpha <mission-id>
sovryn node run alpha <mission-id> --mode autonomous --max-steps 25
sovryn node logs alpha <mission-id>
sovryn node artifacts alpha <mission-id>
```

The architecture is designed for later SSH, `sovryn-agentd`, container, and VM
backends. Node Alpha can create workspaces, run commands, inspect environment
state, collect artifacts, and stream logs.

`--mode validation` is the default smoke run. It checks the local toolchain and
runs the prototype tests.

`--mode autonomous` runs a deterministic research loop:

- create a research plan
- execute bounded command steps
- write a command journal
- create landscape, prior-art, source-review, synthesis, skeptic, benchmark, and summary artifacts
- review `evidence/public-source-search.json` at metadata level
- write `evidence/source-reviews.json`, `SOURCE_REVIEWS.md`, and `RESEARCH_SYNTHESIS.md`
- run prototype verification
- score expected artifacts and research-evidence completeness
- copy evidence back to the invention dossier

The score is an artifact completeness score, not a research quality score. It
records expected, present, and missing artifacts plus basic quality signals such
as prior-art, prototype, tests, defensive publication, source reviews, and
skeptic review. The `researchEvidenceScore` is deterministic: concrete sources
and source-type diversity increase it; query links, adapter failures, high
novelty-risk sources, and unresolved research gaps reduce it.

The loop is deliberately deterministic in the MVP. Future providers can replace
or enrich the steps with full source reading, public search, local models,
browser automation, containers, SSH, or `sovryn-agentd`.

The Autonomous Open Research Factory records a factory-level phase sequence that
Node Alpha can participate in as the execution worker:

- `factory_plan`
- `source_discovery`
- `source_reading`
- `feature_matrix`
- `novelty_gap_analysis`
- `candidate_generation`
- `candidate_selection`
- `invention_generation`
- `prototype_build`
- `test_generation`
- `skeptic_review`
- `factory_scoring`
- `release_packaging`

The Alpha MVP runs this sequence deterministically through the factory service
and generates normal Open Invention missions that can then be validated with
`sovryn node run alpha <mission-id> --mode autonomous`.

Node Alpha is not a security sandbox unless paired with containers, VMs,
firewalling, network namespaces, or equivalent OS controls. The local MVP uses
policy checks and command blocking, not kernel isolation.

Autonomous agents may work in mission workspaces and install legitimate
development dependencies when policy permits. They may not access secrets
directly unless Sovryn grants a controlled capability.
