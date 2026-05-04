# Changelog

## 3.0.0-alpha.20

- Added Corpus Memory under `.sovryn/corpus/` for indexing Factory runs, Open
  Inventions, concrete source cards, duplicate-risk relationships, and release
  metadata.
- Added `sovryn corpus index`, `sovryn corpus search`, `sovryn corpus dedupe`,
  `sovryn corpus report`, and `sovryn release registry update`.
- Added source and invention registries, duplicate maps, corpus quality reports,
  feedback-index placeholders, and `PUBLIC_RELEASES.md` as a public Open
  Invention registry.
- Wired corpus signals into opportunity scans so future research queues can
  reuse source evidence and detect duplicate-like research earlier.

## 3.0.0-alpha.19

- Added secure worker runtime profiles for `sandbox-local`, `container-local`,
  `container-netoff`, `vm-local`, and `ci-isolated`, including explicit
  assurance levels and no-silent-fallback behavior.
- Added `sovryn worker doctor --all`, `sovryn worker policy check`,
  `sovryn worker run <mission-id> --profile container-netoff`, and
  `container-netoff` Node Alpha validation.
- Added worker evidence under `.sovryn/workers/` for sandbox posture, network
  policy, filesystem mount intent, resource limits, worker policy, and
  supply-chain risk.
- Added `container-netoff` execution summaries without raw logs and with clear
  unavailable/degraded results when Docker or Podman is not available.

## 3.0.0-alpha.18

- Added bounded paper reading summaries, patent claim-like reading summaries,
  and source-to-claim mapping artifacts for Factory runs.
- Added `paper-readings.json`, `patent-claim-readings.json`,
  `claim-element-map.json`, `SOURCE_TO_CLAIM_MAP.md`, and
  `PATENT_RISK_NOTES.md`.
- Added Factory gates that require paper/patent/claim-map evidence to exist and
  remain hash-bound to the run.
- Added curated public summaries for the new Alpha.18 evidence without copying
  raw paper text, raw source content, or legal patent conclusions.

## 3.0.0-alpha.17

- Added robust public-source research caching under `.sovryn/research-cache/`
  with TTLs, offline replay, retry/backoff controls, and deterministic fixture
  parity.
- Added adapter health, source dedupe, source quality, and rate-limit evidence
  under `.sovryn/adapters/`.
- Added `sovryn research adapters doctor`, `sovryn research cache status`,
  `sovryn research cache prune`, and `sovryn factory run --real-sources`.
- Kept query links, adapter failures, and mock placeholders out of concrete
  evidence while making their quality limits explicit in reports.

## 3.0.0-alpha.16

- Added Node Alpha Toolchain Autonomy for planning, doctor checks,
  policy-reviewing, status reporting, and redacted install evidence under
  `.sovryn/nodes/alpha/toolchains/`.
- Added `sovryn node alpha toolchain plan`, `doctor`, `install`, and `status`.
- Blocked autonomous host installation by default while recording missing tools,
  allowed research-tool checks, container-local availability, and toolchain
  locks.
- Added Alpha.16 tests and documentation for policy-first toolchain handling.

## 3.0.0-alpha.15

- Added the Research Opportunity Engine for scanning broad goals, ranking
  research opportunities, detecting duplicate-like work, and producing
  opportunity evidence under `.sovryn/opportunities/`.
- Added autonomous research queue commands for building a queue, running
  selected A-class opportunities through existing Factory Mode, and writing
  morning reports.
- Added opportunity review gates for scan/ranking/queue evidence, blocked
  opportunity execution, safety risk, duplicate review, Factory run binding, and
  morning report evidence.
- Added `docs/RESEARCH_OPPORTUNITIES.md` and
  `examples/research-opportunity-demo/`.

## 3.0.0-alpha.14

- Added Factory source readers v2 with bounded reading-depth evidence for
  GitHub, arXiv/OpenAlex metadata, and structured patent-source fixtures.
- Added Source Cards v2, source-card index hashing, Claim/Feature Matrix v3,
  counter-evidence, experiment plans, benchmark plans, improvement cycles, and
  replay reports.
- Added Factory Score v2 readiness labels and stricter gates for source-card
  hashes, counter-evidence, replay freshness, curated public release v3, raw-log
  exclusion, and local-path exclusion.
- Added `sovryn factory improve`, `sovryn factory replay`, `sovryn worker
doctor --profile container-local`, and `container-local` Node Alpha validation
  without silent host fallback.
- Updated the research-factory demo for fixture-backed strict evidence mode and
  curated public release v3.

## 3.0.0-alpha.3

- Fixed the public CI smoke flow to use an explicit deterministic verify command
  under the stricter no-empty-verify policy.

## 3.0.0-alpha.2

- Failed verification when no verify commands are discovered.
- Scanned changed text-file contents, including untracked files, for secrets.
- Split verify hashes into gate-oriented outcome hashes and audit-oriented
  evidence hashes.
- Blocked `reject` on finalized or already rejected missions.
- Added `.sovryn/missions/` and `.sovryn/memory/` to generated `.gitignore`.
- Clarified that plugin modules are trusted code and non-command plugin hooks are
  alpha API contracts that are not wired yet.
- Documented `sovryn-plugin-gitnexus` as workspace-only for the current alpha.

## 3.0.0-alpha.1

- Hardened finalization: verify re-runs immediately before merge.
- Added diff and verify hashes for missions, reviews, and approvals.
- Required current review before finalization by default.
- Invalidated approvals when the diff or verify result changes.
- Loaded GitNexus through plugin configuration instead of the core built-in loader.
- Moved `pg` to optional dependencies and lazy-loaded the Postgres client.
- Expanded CI smoke coverage for a full mission/review/finalize flow.
