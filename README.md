# Sovryn OS v3

Sovryn OS is a local-first evidence kernel for AI-assisted coding and research.
It runs agents in isolated Git worktrees, verifies their work through exit codes,
records artifacts, enforces policy, and requires review before finalization.

Sovryn OS also supports Open Invention missions: deterministic research missions
that create open-source invention dossiers, defensive publications, prototypes,
tests, and publication evidence under `.sovryn/inventions/<slug>/`.

Sovryn OS is not an agent framework. It does not judge with an LLM. It does not
run a daemon. It does not mutate the main tree by default. It does not trust
agent output.

> Agents act. Sovryn verifies. Git isolates. Policy gates. Evidence persists.
> Humans approve.

## Install

```bash
npm install
npm run build
npm test
```

For development:

```bash
npm run format:check
node dist/cli.js --help
```

## Commands

```bash
sovryn init
sovryn spawn "goal" --runner fake --json
sovryn spawn "goal" --runner shell --shell-command "npm test" --json
sovryn continue <mission-id> --json
sovryn status --json
sovryn log <mission-id> --json
sovryn diff <mission-id> --json
sovryn verify <mission-id> --json
sovryn review <mission-id> --json
sovryn approve <mission-id> --json
sovryn finalize <mission-id> --json
sovryn reject <mission-id> --json
sovryn doctor --json
sovryn invent-open "A method for verifiable open-source agent research" --json
sovryn factory-open "A factory for verifiable open-source invention research" --json
sovryn factory run "Develop a method for verifiable autonomous research agents" --json
sovryn factory status <factory-id> --json
sovryn factory review <factory-id> --json
sovryn factory improve <factory-id> --max-cycles 2 --json
sovryn factory replay <factory-id> --json
sovryn factory package <factory-id> --json
sovryn factory publish-github <factory-id> --dry-run --json
sovryn worker doctor --profile container-local --json
sovryn node register alpha --host local --json
sovryn node run alpha <mission-id> --json
sovryn node run alpha <mission-id> --mode autonomous --max-steps 25 --json
sovryn node run alpha <mission-id> --mode validate --profile sandbox-local --json
sovryn node run alpha <mission-id> --mode validate --profile container-local --json
sovryn invention review <mission-id> --json
sovryn invention finalize <mission-id> --json
sovryn publish-github <mission-id> --dry-run --json
sovryn plugin list --json
sovryn plugin run gitnexus status --json
```

Every command supports stable JSON output via `--json`.

## What Sovryn Does

- Creates mission records under `.sovryn/missions/<mission-id>/`.
- Creates isolated Git worktrees under `.sovryn/worktrees/<mission-id>/`.
- Runs runner attempts inside the worktree.
- Discovers and runs verification commands by exit code.
- Records redacted stdout, stderr, verify output, and review artifacts.
- Computes changed files, diff stats, policy risk, and approval requirements.
- Blocks finalize when verification, policy, approval, blocked-path, or secret
  checks fail.
- Re-runs verify immediately before finalize and requires the review/approval to
  match the current diff and verify outcome hash.
- Treats missing verification commands as a failed verification, not a pass.

## Open Inventions

Sovryn OS can act as an autonomous open-source invention lab:

```bash
sovryn invent-open "Develop a new open-source method for verifiable autonomous agent research"
sovryn node register alpha --host local
sovryn node run alpha <mission-id>
sovryn invention review <mission-id>
sovryn invention finalize <mission-id>
sovryn publish-github <mission-id> --org <github-org> --repo <repo>
```

The generated invention directory contains:

```text
.sovryn/inventions/<slug>/
  README.md
  SPEC.md
  DEFENSIVE_PUBLICATION.md
  PRIOR_ART.md
  NOVELTY_NOTES.md
  SAFETY_REVIEW.md
  LICENSE
  CITATION.cff
  prototype/
  tests/
  diagrams/
  evidence/
  release/
```

Sovryn does not file legal patents and does not claim guaranteed patentability,
novelty, or legal patent protection. It produces Open Inventions, Defensive
Publications, and Open Source Research Artifacts. Public publication may affect
patent rights.

Node Alpha is the autonomous research machine concept. The MVP runs Node Alpha
locally. Its validation mode checks toolchain and prototype tests; its
autonomous mode writes a bounded research plan, command journal, research
artifacts, and artifact completeness score. Future backends can use SSH,
`sovryn-agentd`, containers, or VMs. Node Alpha is not a security sandbox unless
paired with real OS isolation.

Prior-art mapping defaults to deterministic placeholders. Optional
public-source adapters can query GitHub, OpenAlex, arXiv, patent search links,
standards/docs links, and general web search links when
`research.publicSearch.enabled` is set in `.sovryn/config.json`. Results are
written to `evidence/public-source-search.json` with quality kinds
(`concrete_source`, `query_link`, `adapter_failure`, `mock_placeholder`) and
status counts. Query links alone are not treated as concrete prior-art evidence.
Publication review verifies that this evidence is hash-bound to the dossier and
that unknown prior-art kinds are invalid, not placeholders. Strict real
publication can require concrete prior-art sources with
`research.requireConcretePriorArtForPublish`.

In autonomous mode, Node Alpha now runs a `public_research_review` phase over
that evidence. It writes `evidence/source-reviews.json`, `SOURCE_REVIEWS.md`,
and `RESEARCH_SYNTHESIS.md`, updates prior-art/novelty/skeptic artifacts, and
adds a `researchEvidenceScore` to `artifact-score.json`. Query links, adapter
failures, and MVP placeholders are marked as unreviewed/degraded evidence, not
as concrete prior art.

Deep source reading is opt-in through `research.sourceReading.enabled`. The
first readers cover GitHub repository README/metadata, arXiv abstract metadata,
and OpenAlex work metadata. Their output is `evidence/source-readings.json` and
is used by Node Alpha to mark concrete sources as `reviewed_deep_source`.

Factory Mode is available with `sovryn factory-open "<research-goal>"`. It
builds on Open Inventions by extracting features from source search/readings,
mapping novelty gaps, generating candidate inventions, selecting one candidate,
writing `FACTORY_REPORT.md`, scoring factory readiness, and blocking weak real
publication through the `FACTORY_STRENGTH_FOR_PUBLISH` gate.

The Autonomous Open Research Factory is available through:

```bash
npm install
npm run build
sovryn init
sovryn factory run "Develop a method for verifiable autonomous research agents" --json
sovryn factory status <factory-id> --json
sovryn factory review <factory-id> --json
sovryn factory package <factory-id> --json
```

The factory accepts a broad research goal, builds a deterministic research
plan, maps research questions, reuses the public-source adapters and source
readers, creates a feature matrix and candidate novelty-gap map, generates
candidate Open Inventions, selects one candidate, triggers a normal Open
Invention mission with a runnable prototype and tests, scores research quality,
and packages curated public evidence under
`.sovryn/factory/<slug>/release/public/`. Factory runs never treat query links,
adapter failures, or mock placeholders as reviewed prior art. Weak or mock-heavy
runs are marked degraded or blocked, and public release packaging excludes raw
command logs.

Factory strictness is controlled under `research.factory`:

```json
{
  "research": {
    "publicSearch": {
      "enabled": false,
      "fixtureMode": false
    },
    "sourceReading": {
      "enabled": false,
      "fixtureMode": false
    },
    "factory": {
      "maxCycles": 1,
      "maxCandidates": 3,
      "requireConcreteSources": false,
      "requirePrototype": true,
      "requireTests": true,
      "allowMockMode": true,
      "packagePublicEvidence": true,
      "blockHighSafetyRisk": true,
      "strictEvidenceMode": false,
      "minConcreteSources": 1,
      "minConcreteSourcesRead": 1,
      "minEvidenceStrengthScore": 60,
      "minReproducibilityScore": 60,
      "requireSourceDiversity": false,
      "requireDryRunPublishPackage": false,
      "requireCounterEvidence": false,
      "requireExperimentPlan": false,
      "requireContainerExecution": false,
      "minReadingDepthScore": 40,
      "minClaimMappingScore": 50,
      "minNoveltyRiskScore": 50
    }
  }
}
```

Enable `research.publicSearch.enabled` and `research.sourceReading.enabled` to
make factory evidence stronger. Fixture mode can simulate concrete GitHub and
paper sources, patent/standards query links, and adapter failures without
network access for tests and demos. Defaults remain deterministic and do not
require paid APIs or an LLM.

Strict evidence mode makes the factory more conservative:

- no concrete sources blocks review;
- no concrete source readings blocks review;
- query links, adapter failures, and mock placeholders do not count as concrete
  source evidence;
- weak evidence or reproducibility scores block review;
- source cards, `CLAIM_FEATURE_MATRIX.md`, `COUNTER_EVIDENCE.md`,
  `EXPERIMENT_PLAN.md`, `BENCHMARK_PLAN.md`, `NOVELTY_GAP_REPORT.md`,
  `candidate-selection-rationale.md`, replay evidence, prototype execution
  evidence, and curated public release checks must pass.

The factory now writes compact source cards under
`.sovryn/factory/<slug>/source-cards/`, a source-card-backed claim/feature
matrix, a novelty gap report, candidate-selection rationale, and sandbox-local
prototype execution evidence under `.sovryn/factory/<slug>/execution/`.

Alpha.14 adds deeper research-intelligence artifacts: bounded source reading
depths, Source Cards v2, Claim/Feature Matrix v3, counter-evidence,
experiment/benchmark plans, deterministic improvement cycles, replay, and
readiness labels (`blocked`, `weak`, `moderate`, `strong`). The score is capped
when evidence is shallow, counter-evidence is missing, source cards are stale,
prototype execution is absent, or public release evidence contains raw logs or
local paths. These are research quality signals, not legal novelty or
patentability conclusions.

`sandbox-local` is a constrained command profile, not a kernel-level sandbox: it
runs only allowlisted generated prototype test commands inside the prototype
directory and records redacted evidence. Use containers, VMs, network namespaces,
or a dedicated Linux user for strong isolation.

`container-local` is a sandbox-ready worker profile that uses Docker or Podman
when available and reports unavailable when no runtime exists:

```bash
sovryn worker doctor --profile container-local --json
sovryn node run alpha <mission-id> --mode validate --profile container-local --json
```

It never silently falls back to host execution. It is stronger than
`sandbox-local`, but it is not a formal kernel-level sandbox or VM boundary.

Factory dry-run publication is controller-owned:

```bash
sovryn factory publish-github <factory-id> --dry-run --json
```

It packages curated factory evidence, reviews the generated Open Invention
mission, calls the existing GitHub dry-run path, and writes
`factory-publication-intent.json`. It does not expose GitHub credentials and it
does not perform real publication.

GitHub credentials stay with Sovryn Controller. The autonomous agent prepares
artifacts, but `publish-github` is gated by dossier, license, verification,
source-stability, source-hash freshness, secret-scan, safety, prior-art,
large-file scan coverage, defensive-publication, and finality checks. Dry-run
publication can stage a release package before finalization; real publication is
finalization-gated. Release repos include curated public evidence under
`evidence/public/`; raw command logs, local working directories, and final
controller-only GitHub evidence remain local by default.

## What Sovryn Does Not Do

- It does not decide truth with an LLM.
- It does not ship domain-specific lab workflows such as OQP in the core.
- It does not implement password SSH.
- It does not store unredacted secrets in prompts, logs, mission files, or
  artifacts.

## Default Storage

File storage is the default storage driver. Postgres is available as an optional
adapter through `storage.driver = "postgres"` and `SOVRYN_DATABASE_URL` or the
configured `storage.postgres.urlEnv`.

Mission evidence and memory are local by default and are added to `.gitignore`
by `sovryn init`. Commit `.sovryn/missions/` or `.sovryn/memory/` only when a
project intentionally wants to publish those artifacts.

## Plugins

The plugin API is intentionally small. Command plugins are executable today.
Verify providers, artifact parsers, and review enrichers are alpha extension
contracts and are not yet wired into the core verify/review flow. Domain logic
such as OQP, deploy, and lab workflows belongs in plugins, not in the core.

This repo includes `sovryn-plugin-gitnexus` as an optional plugin package. Enable
it by adding it to `.sovryn/plugins.json`:

```json
{
  "plugins": [
    {
      "name": "gitnexus",
      "module": "sovryn-plugin-gitnexus",
      "export": "createGitNexusPlugin"
    }
  ]
}
```

```bash
sovryn plugin run gitnexus status --json
sovryn plugin run gitnexus analyze --json
sovryn plugin run gitnexus impact MissionService --json
```

See `docs/PLUGIN_API.md`.

## Security

Worktrees are enabled by default. Secrets in logs and evidence are redacted.
Finalize runs a secret scan over diff, prompts, stdout, stderr, verify output,
and review artifacts before merging. Runner and verify commands also enforce the
network policy by blocking common network tools when `policy.allowNetwork` is
false.

The network policy is best-effort process policy, not a kernel-level sandbox. For
strong no-network isolation, run Sovryn inside a container, network namespace, or
CI/runtime environment with networking disabled.

See `docs/SECURITY.md`.
