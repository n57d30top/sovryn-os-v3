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
sovryn factory run "Develop a method for verifiable autonomous research agents" --real-sources --json
sovryn factory status <factory-id> --json
sovryn factory review <factory-id> --json
sovryn factory improve <factory-id> --max-cycles 2 --json
sovryn factory replay <factory-id> --json
sovryn factory package <factory-id> --json
sovryn factory publish-github <factory-id> --dry-run --json
sovryn research scan --goal "Improve autonomous open-source research agents" --json
sovryn research queue build --goal "Improve autonomous open-source research agents" --json
sovryn research queue run --max-runs 1 --json
sovryn research morning-report --json
sovryn research adapters doctor --json
sovryn research cache status --json
sovryn research cache prune --json
sovryn corpus index --json
sovryn corpus search "source-card trust scoring" --json
sovryn corpus dedupe --json
sovryn corpus report --json
sovryn release candidates build --max 3 --json
sovryn release candidates review --json
sovryn release candidates package --json
sovryn release registry update --json
sovryn quality evaluate <factory-id> --json
sovryn quality evaluate-invention <mission-id> --json
sovryn quality compare <factory-id-a> <factory-id-b> --json
sovryn quality report --json
sovryn quality leaderboard --json
sovryn worker doctor --profile container-local --json
sovryn worker doctor --profile container-netoff --json
sovryn worker doctor --all --json
sovryn worker policy check --json
sovryn worker run <mission-id> --profile container-netoff --json
sovryn node register alpha --host local --json
sovryn node run alpha <mission-id> --json
sovryn node run alpha <mission-id> --mode autonomous --max-steps 25 --json
sovryn node run alpha <mission-id> --mode validate --profile sandbox-local --json
sovryn node run alpha <mission-id> --mode validate --profile container-local --json
sovryn node run alpha <mission-id> --mode validate --profile container-netoff --json
sovryn node alpha toolchain plan <factory-id> --json
sovryn node alpha toolchain doctor --json
sovryn node alpha toolchain install <toolchain-plan-id> --profile container-local --json
sovryn node alpha toolchain status --json
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
      "fixtureMode": false,
      "cacheEnabled": true,
      "cacheTtlHours": 168,
      "retryAttempts": 2,
      "retryBaseDelayMs": 100,
      "offlineReplay": false
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

## Research Opportunity Engine

Alpha.15 adds a Research Opportunity Engine above Factory Mode. The engine is a
portfolio manager for autonomous open research: it scans broad goals, previous
Factory runs, previous Open Inventions, weak scores, novelty gaps,
counter-evidence, failed gates, and optional fixture/public-source signals. It
scores opportunities, builds an auditable queue, starts selected Factory runs,
and writes a morning report.

```bash
sovryn research scan --goal "Improve autonomous open-source research agents" --json
sovryn research queue build --goal "Improve autonomous open-source research agents" --json
sovryn research queue status --json
sovryn research queue run --max-runs 1 --json
sovryn research opportunity review <opportunity-id> --json
sovryn research morning-report --json
```

Artifacts are written under `.sovryn/opportunities/`:

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

Queue execution starts Factory runs only. It does not publish to GitHub and does
not bypass Factory, Open Invention, safety, secret, replay, or publication
gates. Blocked opportunities are not executed. Duplicate-like opportunities are
scored and explained instead of being silently discarded.

## Corpus Memory

Alpha.20 adds a local corpus memory layer. It indexes previous Factory runs,
generated Open Inventions, source cards, duplicate-risk relationships, dry-run
release packages, and public release metadata under `.sovryn/corpus/`.

```bash
sovryn corpus index --json
sovryn corpus search "source-card trust scoring" --json
sovryn corpus dedupe --json
sovryn corpus report --json
sovryn release registry update --json
```

Corpus artifacts include:

```text
.sovryn/corpus/
  corpus-index.json
  invention-registry.json
  source-registry.json
  duplicate-map.json
  feedback-index.json
  corpus-quality-report.json
  corpus-quality-report.md
  PUBLIC_RELEASES.md
```

The corpus improves future opportunity scans by surfacing reusable source
evidence and duplicate-risk signals. It is local memory by default and is not
published automatically. `PUBLIC_RELEASES.md` is a public Open Invention
registry for releases or dry-run release packages; it is not a patent filing,
not a patentability opinion, and not a freedom-to-operate opinion.

## Release Candidates

Alpha.21 adds a release-candidate workflow for proving that the factory can
produce reviewable Open Invention release candidates. It runs three
fixture-backed strong Factory goals by default, improves each run, creates an
Open Invention mission, performs a GitHub dry-run publication through the
existing controller-owned path, indexes corpus evidence, and queues the
candidate for human review.

```bash
sovryn release candidates build --max 3 --json
sovryn release candidates review --json
sovryn release candidates package --json
```

Release-candidate artifacts are written under `.sovryn/releases/candidates/`:

```text
.sovryn/releases/candidates/
  release-candidates.json
  release-candidate-review.json
  publication-queue.json
  RELEASE_CANDIDATES.md
  RELEASE_CANDIDATE_REVIEW.md
  PUBLICATION_QUEUE.md
  public/
```

The review layer checks completeness, Factory replay evidence, curated public
evidence, prototype execution, corpus duplicate review, raw-log exclusion,
secret scanning, careful non-legal language, and human-review requirements.
Release candidates are not published automatically. Real GitHub publication
still goes through Open Invention finalization and Sovryn publication gates.

## Research Quality Evaluator

Alpha.22 adds an independent Research Quality Evaluator. It grades Factory runs,
Open Invention missions, source cards, claim matrices, counter-evidence,
prototypes, tests, release packages, and corpus uniqueness using explicit
criteria. This is a second-opinion evaluator; it does not replace Factory gates
or publication gates.

```bash
sovryn quality evaluate <factory-id> --json
sovryn quality evaluate-invention <mission-id> --json
sovryn quality compare <factory-id-a> <factory-id-b> --json
sovryn quality report --json
sovryn quality leaderboard --json
```

Quality artifacts are written under `.sovryn/quality/`:

```text
.sovryn/quality/
  evaluations/
  inventions/
  quality-report.json
  QUALITY_REPORT.md
  quality-leaderboard.json
  QUALITY_LEADERBOARD.md
  evaluator-rubric.json
  evaluator-findings.json
```

The evaluator scores source quality, reading depth, claim mapping,
counter-evidence, novelty-risk honesty, prototype relevance, test relevance,
reproducibility, safety review, publication clarity, corpus uniqueness, and
defensive-publication value. It also detects shallow readings, unsupported
differentiators, missing counter-evidence, trivial tests, unexecuted benchmark
claims, unsafe legal language, duplicate-like inventions, and public release
leakage risks.

Release-candidate review now includes quality evidence when available. A
candidate with a quality score below `research.quality.minReleaseQualityScore`
is blocked from being queued as publish-ready. This is still not a legal
patentability, legal novelty, or freedom-to-operate opinion.

## Node Alpha Toolchains

Alpha.16 adds controlled toolchain planning for Node Alpha. The toolchain layer
checks which legitimate research tools are available, proposes a bounded plan,
reviews installation policy, and writes redacted evidence under
`.sovryn/nodes/alpha/toolchains/`.

```bash
sovryn node alpha toolchain plan <factory-id> --json
sovryn node alpha toolchain doctor --json
sovryn node alpha toolchain install <toolchain-plan-id> --profile container-local --json
sovryn node alpha toolchain status --json
```

The MVP does not install software on the host. It blocks `sudo`, host package
managers, shell-piped installers, and global host installs. Missing tools are
recorded as blocked or requiring manual/operator-approved provisioning unless a
future worker profile can install them safely. `container-local` remains a
constrained profile, not a formal sandbox proof.

Opportunity settings live under `research.opportunities`:

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

Enable `research.publicSearch.enabled` and `research.sourceReading.enabled` to
make factory evidence stronger. Fixture mode can simulate concrete GitHub and
paper sources, patent/standards query links, and adapter failures without
network access for tests and demos. Defaults remain deterministic and do not
require paid APIs or an LLM.

Alpha.17 hardens real public-source research. Public-source discovery can cache
results under `.sovryn/research-cache/`, retry transient adapter failures, replay
from cache when offline replay is enabled, deduplicate repeated source URLs, and
write adapter health, source quality, dedupe, and rate-limit evidence under
`.sovryn/adapters/`.

```bash
sovryn factory run "Develop a method for verifiable autonomous research agents" --real-sources --json
sovryn research adapters doctor --json
sovryn research cache status --json
sovryn research cache prune --json
```

`--real-sources` enables public search for that Factory run without changing the
stored config. Query links remain research leads, adapter failures remain
degraded evidence, and mock placeholders cap readiness. Cache/offline replay
improves reproducibility; it does not turn weak evidence into concrete prior
art.

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

Alpha.18 adds bounded fulltext/claim intelligence artifacts on top of the same
evidence model. Factory runs now write `paper-readings.json`,
`patent-claim-readings.json`, `claim-element-map.json`,
`SOURCE_TO_CLAIM_MAP.md`, and `PATENT_RISK_NOTES.md`. These map source cards,
paper readings, and patent-like claim elements to candidate claim/features using
careful language such as "possible difference" and "requires human/legal
review." They are not legal claim construction, not patentability opinions, and
not freedom-to-operate opinions.

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

Alpha.19 adds a secure worker runtime layer with explicit assurance profiles:
`sandbox-local` (low), `container-local` (medium), `container-netoff`
(medium-high), and unavailable placeholders for `vm-local` and `ci-isolated`.
The new `container-netoff` profile requires Docker or Podman, requests
`--network none`, avoids mounting the user's home directory, records resource
limit intent, and writes execution summaries without raw logs:

```bash
sovryn worker doctor --all --json
sovryn worker policy check --json
sovryn node run alpha <mission-id> --mode validate --profile container-netoff --json
sovryn worker run <mission-id> --profile container-netoff --json
```

If no container runtime is available, `container-netoff` writes unavailable
evidence and stops; it does not run the same command on the host. Worker policy
reports are written under `.sovryn/workers/` and summarize sandbox assurance,
network policy, filesystem mount intent, resource limits, and supply-chain
risks. These profiles are still not a guarantee against hostile code. For high
assurance, pair Sovryn with hardened containers, VMs, dedicated users,
firewalling, and secret isolation.

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
