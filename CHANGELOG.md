# Changelog

## 4.2.0-rc.1

- Added Frontier Scientific Production command families:
  `sovryn frontier benchmark expand`, `candidates generate`,
  `baseline-dominance run`, `replication run`, `package build`, and
  `frontier trial`.
- Added `.sovryn/frontier/` artifacts for verified benchmark expansion,
  1000-candidate method factory runs, top-20 method cards, baseline-dominance
  falsification, independent replication variants, paper-grade result packages,
  and full frontier scientific production trials.
- Extended the Scientific Knowledge Engine to read frontier production
  artifacts as evidence-bound local sources.
- Added curated public corpus publication for
  `frontier_scientific_production_trial` results when candidate generation,
  benchmark coverage, baseline-dominance, replication, paper-package, safety,
  and public hygiene gates pass.

## 4.1.0-rc.1

- Added Field-Grade Autonomous Science command families:
  `sovryn sources verify`, `datasets`, `benchmark real-data`, `campaign`,
  `toolchain`, `challenge`, and `field-grade trial`.
- Added `.sovryn/sources/registry/`, `.sovryn/datasets/registry/`,
  `.sovryn/benchmarks/real-data/`, `.sovryn/campaigns/`,
  `.sovryn/toolchains/`, `.sovryn/challenges/`, and `.sovryn/field-grade/`
  artifacts for verified external sources, verified datasets, dataset-backed
  benchmark runs, checkpointed campaigns, validated toolchains, external
  challenge runs, and full field-grade autonomy trials.
- Extended the Scientific Knowledge Engine to read field-grade source,
  dataset, campaign, toolchain, challenge, and trial artifacts as
  evidence-bound local sources.
- Added curated public corpus publication for
  `field_grade_autonomous_science_trial` results when verified-source,
  dataset, toolchain, benchmark, challenge, reproduction, falsification,
  knowledge-update, safety, and hygiene gates pass.

## 4.0.0-rc.1

- Added Reality-Grade Scientific Autonomy command families:
  `sovryn sources`, `benchmark suite/run/compare/report`,
  `reproduce independent`, `falsify adversarial`, `reality trial`, and
  `reality-grade trial`.
- Added `.sovryn/sources/`, `.sovryn/benchmarks/`,
  `.sovryn/reproduction/`, `.sovryn/falsification/`,
  `.sovryn/reality-trials/`, and `.sovryn/reality-grade/` artifacts for
  structured source cards, dataset cards, benchmark runs, independent
  reproduction evidence, adversarial falsification evidence, and full
  reality-grade autonomy trials.
- Extended the Scientific Knowledge Engine to read reality-grade source,
  benchmark, reproduction, falsification, and trial artifacts as
  evidence-bound local sources.
- Added curated public corpus publication for
  `reality_grade_autonomous_science_trial` results when source, benchmark,
  reproduction, falsification, knowledge-update, safety, and hygiene gates
  pass.

## 3.9.0-rc.1

- Added the Scientific Knowledge Engine command family:
  `sovryn knowledge graph`, `claims`, `confidence`, `contradictions`,
  `method-atlas`, `next-experiments`, and `trial`.
- Added `.sovryn/knowledge/` artifacts for evidence-bound claim extraction,
  deterministic confidence scoring, contradiction cards, method atlases,
  next-best-experiment ranking, bounded experiment execution, and full
  knowledge-engine trials.
- Added curated public corpus publication for
  `scientific_knowledge_engine_trial` results when public hygiene, no-fake-
  breakthrough, and no-unsupported-claim gates pass.
- Added Scientific Knowledge Engine documentation and examples covering claim
  graphs, confidence labels, contradiction resolution experiments, method
  atlases, and next-best-experiment selection.

## 3.8.0-rc.1

- Added the Research Strategist command family:
  `sovryn strategy opportunities`, `rank`, `program`, `execute`,
  `reproduce-queue`, `falsify-queue`, and `trial run`.
- Added `.sovryn/strategy/` artifacts for memory-driven opportunity extraction,
  expected-information-gain style ranking, research-program generation,
  adaptive execution state, strategic reproduction/falsification queues, and
  full strategy trials.
- Added curated public corpus publication for
  `autonomous_research_strategy_trial` results when public hygiene and safety
  gates pass.
- Added Research Strategist documentation and examples covering opportunity
  cards, ranking explanations, adaptive decisions, negative results, and next
  research direction reports.

## 3.0.0-beta.9

- Added the Real Pilot Release Candidates workflow with
  `sovryn pilot run --all`, `sovryn pilot review`, and `sovryn pilot package`.
- Added three built-in pilot scenarios for evidence-chain records,
  policy-gated Linux toolchain installation, and corpus deduplication of
  defensive publications.
- Added `.sovryn/pilots/` artifacts for pilot runs, opportunity bindings,
  Factory/Open Invention mission bindings, quality/security/reliability
  evidence, publication dry-run intents, corpus entries, and human review
  checklists.
- Updated the E2E harness with
  `sovryn e2e run --profile beta-fixture --release-candidates 3` so the
  fixture proof can validate multiple release candidates without real GitHub
  publication.
- Updated release-candidate scoring with evidence-strength, publication-safety,
  quality-label, and candidate-status fields for honest human review routing.
- Updated publication ledger behavior so pilot dry-runs append audit records
  instead of overwriting previous candidates.

## 3.0.0-beta.8

- Stabilized the Beta E2E replay path by running Factory improvement cycles for
  autonomy campaign Factory runs before packaging and replay.
- Added replay-critical versus total replay reporting to
  `sovryn reliability replay-all --json`, including blocking replay failures,
  non-blocking limitations, skipped non-critical counts, and recommended fixes.
- Added E2E replay diagnostics, launch limitation evidence, and a documented
  replay contract under `.sovryn/e2e/`.
- Updated launch checks to distinguish blocking limitations, accepted beta
  limitations, and informational limitations.
- Updated the E2E scorecard to use replay-critical pass rate for launch
  readiness while still reporting total replay pass rate.

## 3.0.0-beta.7

- Added the Beta.7 end-to-end validation harness with `sovryn e2e doctor`,
  `sovryn e2e run --profile beta-fixture`, and `sovryn e2e report`.
- Added `.sovryn/e2e/` evidence for build sanity, fresh-repo initialization,
  beta flow, autonomy campaign, Factory/Open Invention flow, worker validation,
  quality/benchmark flow, publication governance dry-run, audit/safety flow,
  corpus export, launch/pilot flow, scorecards, failures, risk registers, and
  reports.
- Added deterministic fixture E2E execution from built `dist/cli.js`, including
  a fresh temporary Git repository, curated public artifact scans, no-real-
  publication checks, no-silent-fallback checks, and degraded readiness
  reporting.
- Added E2E tests and demo docs under `examples/e2e-beta-demo/`.
- Hardened worker toolchain evidence wording so blocked installer classes do
  not look like executable unsafe commands in security audits.

## 3.0.0-beta.6

- Added Beta operationalization commands for autonomy campaigns, publication
  governance, persistent worker jobs, research benchmarks, public corpus API
  exports, launch checks, and pilot runs.
- Added `.sovryn/autonomy/`, `.sovryn/publication/`,
  `.sovryn/workers/alpha/`, `.sovryn/benchmarks/`, `.sovryn/launch/`, and
  `public-corpus/api/` evidence roots.
- Added dry-run-first publication governance with approval ledgers and real
  publication disabled by default.
- Added worker job registration, queue, heartbeat, execution, and cleanup
  evidence with no silent fallback from unavailable container profiles.
- Added a 20-task research benchmark suite and calibration artifacts.
- Added launch and pilot reports for public beta / v1.0-RC readiness review.

## 3.0.0-alpha.26

- Added beta-readiness commands: `sovryn beta check`, `sovryn beta demo`, and
  `sovryn beta package`.
- Added `.sovryn/beta/` artifacts for beta checks, demo runs, and curated beta
  packages.
- Added beta gates for docs completeness, demo evidence, security audit,
  reliability audit, quality evaluator presence, public corpus export, release
  candidates, public leak absence, legal-claim safety, test-count minimums, and
  local CI-equivalent checks.
- Added curated beta package summaries for beta check, demo, security audit,
  reliability audit, quality report, public corpus, and release candidates.
- Added beta docs and example demo materials.

## 3.0.0-alpha.25

- Added security, reliability, and abuse audit commands:
  `sovryn security audit`, `security audit-public-release`,
  `security audit-worker`, `reliability audit`, `reliability replay-all`,
  `safety scan-goal`, and `safety scan-release`.
- Added `.sovryn/audits/` artifacts for security audits, reliability audits,
  replay-all reports, and abuse-risk reports.
- Added hardening gates for command-injection risk, unsafe installers, host
  `sudo`, public leaks, fake sandbox claims, fake patent claims, and replay-all
  consistency.
- Added conservative public-release scans for raw stdout/stderr fields/files,
  local absolute paths, secret-like text, non-curated public files, unsafe
  release content, and legal patentability language.
- Added 50 audit tests covering goal safety, public release leaks, worker audit,
  command evidence hardening, replay-all, reliability audit, and CLI JSON
  outputs.

## 3.0.0-alpha.24

- Added public corpus discovery exports under `.sovryn/corpus/public/`.
- Added `sovryn corpus export-public`, `corpus site build`, `corpus graph`,
  `corpus compare`, and `corpus explain`.
- Added curated public corpus artifacts for inventions, sources, source cards,
  claim features, release candidates, quality scores, duplicate-risk clusters,
  and corpus graph data.
- Added public corpus gates for curated-only exports, no private paths, no raw
  logs, no secrets, quality-label inclusion, and release-status inclusion.
- Added an optional deterministic `public-corpus/` static site shell for public
  demos.

## 3.0.0-alpha.23

- Added the Autonomous Overnight Operator for coordinating opportunity queues,
  Factory runs, Quality evaluation, bounded improve cycles, replay, curated
  packaging, corpus updates, and morning briefs.
- Added `sovryn overnight plan`, `run`, `status`, `stop`, and `report`.
- Added `.sovryn/overnight/` artifacts including plans, budgets, decisions,
  events, results, operator reports, and morning briefs.
- Added overnight gates for budget enforcement, blocked-opportunity isolation,
  quality binding, worker execution binding, corpus updates, morning brief
  evidence, and no-real-publication guarantees.
- Kept overnight operation dry-run/packaging only; it does not perform real
  GitHub publication or bypass existing Factory, Quality, Worker, or Open
  Invention gates.

## 3.0.0-alpha.22

- Added the Research Quality Evaluator for grading Factory runs and Open
  Invention missions using explicit evidence-based dimensions.
- Added `sovryn quality evaluate`, `evaluate-invention`, `compare`, `report`,
  and `leaderboard`.
- Added `.sovryn/quality/` artifacts including quality reports, leaderboards,
  evaluator rubrics, findings, and per-target evaluations.
- Added quality gates for minimum score, inflated strong-label detection,
  non-trivial prototype tests, meaningful counter-evidence, and safe
  publication language.
- Wired release-candidate review to quality evaluations so weak quality blocks
  publish-ready candidate queueing.

## 3.0.0-alpha.21

- Added the release-candidate workflow for building, reviewing, and packaging
  human-reviewable Open Invention release candidates.
- Added `sovryn release candidates build`, `review`, and `package`.
- Added release-candidate scoring, publication queue reports, corpus duplicate
  review, curated public candidate packages, and gates for replay evidence,
  prototype execution, raw-log exclusion, secret scanning, and non-legal
  publication language.
- Added `docs/RELEASE_CANDIDATES.md` and
  `examples/release-candidate-demo/`.

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
