# Sovryn OS v3

Current version: `3.3.0-rc.1`

Sovryn OS is a local-first evidence kernel for AI-assisted coding and research.
It runs agents in isolated Git worktrees, verifies their work through exit codes,
records artifacts, enforces policy, and requires review before finalization.

Sovryn OS also includes an autonomous open-source research factory and a
scientific-method layer. It can discover research opportunities, run
Factory Mode, generate Open Invention release candidates, evaluate quality, run
overnight operator cycles, export a curated public corpus, audit
security/reliability evidence, run autonomy campaigns, govern publication
queues, execute persistent worker jobs, benchmark research quality, package
launch/pilot evidence, and now create hypothesis-driven computational-science
studies, bind safe public/proxy datasets with provenance and replay evidence,
and publish eligible studies into the curated public corpus.

Sovryn OS is not a blind agent framework. It does not judge truth with an LLM,
does not require paid APIs, does not mutate the main tree by default, does not
publish outside explicit policy-gated workflows, and does not trust agent
output.

> Agents act. Sovryn verifies. Git isolates. Policy gates. Evidence persists.
> Humans approve.

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not file legal patents and does not provide legal
novelty, patentability, or freedom-to-operate opinions.

## Current 3.3 RC Line

Sovryn OS v1.1 started the transition from autonomous open-invention researcher
to autonomous computational scientist. Alpha.1 added the formal study
structure: question, hypothesis, null hypothesis, experiment design, baseline,
metrics, falsification criteria, replication plan, and safety scope. Alpha.2
added the first deterministic data/instrument/runtime path for safe synthetic
computational experiments. Alpha.3 added bounded statistical analysis, baseline
comparison, ablations, sensitivity sweeps, and error analysis. Alpha.4 adds
replication, negative tests, falsification reports, and hypothesis status
updates. Alpha.5 adds scientific memory ledgers, study-bound source cards,
literature grounding, and next-question generation. v1.1 RC.1 added a
deterministic autonomous computational-science campaign that selects safe
questions, completes two hypothesis-driven studies, writes paper-style reports,
updates scientific memory, and prepares curated local corpus packages. v1.1
RC.2 publishes completed science campaign studies into the public corpus as
first-class `computational_science_study` results with public hypotheses,
statistics, replication, falsification, memory updates, API output, and
publish-audit gates.

Sovryn OS 3.2 Alpha.1 adds the first real-data ingestion and provenance layer:
safe dataset search, deterministic cache, validation, provenance, replay, and
real-vs-synthetic comparison artifacts. It still treats proxy data
conservatively and does not make broad real-world performance claims.
3.2 Alpha.2 adds bounded scientific reproduction: source-claim extraction,
method/data/metric requirement extraction, reproduction planning, deterministic
runs, reproduction analysis, and careful reproduced/partially-reproduced/
inconclusive labels. 3.2 Alpha.3 adds autonomous scientific peer review:
methodological critique, corpus review, author response, revision planning,
unsupported-claim blocking, and showcase-science review gates.
3.2 Alpha.4 adds scientific meta-analysis and learning: cross-study summaries,
contradiction detection, failed-hypothesis lessons, memory synthesis, next-study
planning, and four-week follow-up research-program proposals. The 3.3 RC line
hardens public science studies into reviewable showcase-science entries, adds
real-data study templates, external reproduction search/publication, revision
publication, stable-findings reports, and a bounded seven-day autonomous
computational scientist trial. Scientific support remains bounded to the
evidence actually produced.

| Version         | Focus                            | Result                                                                                                                                                                       |
| --------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `3.1.0-alpha.1` | Scientific Method Core           | Adds `sovryn science` commands for safe computational questions, hypotheses with null hypotheses, experiment designs, study status, and gate reviews.                        |
| `3.1.0-alpha.2` | Data and Instrument Runtime      | Adds synthetic dataset generation, generated baseline/candidate/runner instruments, Node Alpha execution evidence, and deterministic experiment run gates.                   |
| `3.1.0-alpha.3` | Statistics and Ablations         | Adds evidence-bound confusion metrics, baseline comparison, ablation reports, sensitivity sweeps, and false-positive/false-negative error analysis.                          |
| `3.1.0-alpha.4` | Replication and Falsification    | Adds deterministic replication summaries, negative tests, falsification reports, and hypothesis status updates.                                                              |
| `3.1.0-alpha.5` | Memory and Literature Grounding  | Adds scientific memory ledgers, fixture-backed source cards, literature-grounding reports, and follow-up question generation.                                                |
| `3.1.0-rc.1`    | Science Campaign                 | Adds `sovryn science campaign run` for two-study autonomous computational-science campaigns with statistics, replication, falsification, memory, and curated local packages. |
| `3.1.0-rc.2`    | Public Science Study Publication | Adds `sovryn science publish`, `publish-all`, and `publish-audit` for publishing completed computational-science studies into the public corpus with strict hygiene gates.   |
| `3.2.0-alpha.1` | Real Data Ingestion              | Adds `sovryn science data search/ingest/validate/provenance/cache/replay` with safe public/proxy datasets, provenance, validation, replay cache, and study binding.          |
| `3.2.0-alpha.2` | Scientific Reproduction          | Adds `sovryn science reproduce plan/run/analyze/report` for safe bounded reproduction of external or internal computational claims.                                          |
| `3.2.0-alpha.3` | Scientific Peer Review           | Adds `sovryn science peer-review`, `peer-review-corpus`, `rebuttal`, and `revise` for automated critique, response, and revision planning before showcase promotion.         |
| `3.2.0-alpha.4` | Meta-Analysis and Learning       | Adds `sovryn science meta-analysis`, `memory synthesize`, `contradictions find`, `research-program propose`, and `next-study plan` for learning across studies.              |
| `3.2.1`         | Science Showcase Hardening       | Adds public science-study score hardening, peer-review/falsification showcase gates, showcase-science docs, and science showcase index/API output.                           |
| `3.2.2`         | Real-Data Science Studies        | Adds `sovryn science study run-real-data` templates with provenance, validation, cache/replay, and real-vs-synthetic comparison artifacts.                                   |
| `3.2.3`         | External Reproduction Challenge  | Adds `sovryn science reproduce search` and `reproduce publish` for safe bounded reproduction challenges and public reproduction reports.                                     |
| `3.2.4`         | Review/Rebuttal/Revision         | Adds `sovryn science revision publish` for public author-response, revision-plan, and revised-report artifacts.                                                              |
| `3.2.5`         | Stable Scientific Learning       | Adds `sovryn science stable-findings report` and stricter scientific-memory learning reports.                                                                                |
| `3.3.0-rc.1`    | Seven-Day Science Trial          | Adds `sovryn science trial run --days 7 --studies 6` with six-study selection, reproduction attempts, revision loops, meta-analysis, and RC gate evidence.                   |

New science commands:

```bash
sovryn science question "energy anomaly detection" --json
sovryn science hypothesize <question-id> --json
sovryn science experiment design <hypothesis-id> --json
sovryn science data generate <study-id> --json
sovryn science data search "energy weather anomaly public dataset" --json
sovryn science data ingest public-weather-energy-proxy-v1 --study-id <study-id> --json
sovryn science data validate public-weather-energy-proxy-v1 --json
sovryn science data provenance public-weather-energy-proxy-v1 --json
sovryn science data cache status --json
sovryn science data replay public-weather-energy-proxy-v1 --json
sovryn science instrument build <study-id> --json
sovryn science experiment run <experiment-id> --json
sovryn science experiment status <experiment-id> --json
sovryn science analyze <experiment-id> --json
sovryn science ablate <experiment-id> --json
sovryn science sensitivity <experiment-id> --json
sovryn science compare-baseline <experiment-id> --json
sovryn science replicate <experiment-id> --runs 3 --json
sovryn science falsify <hypothesis-id> --json
sovryn science negative-tests <study-id> --json
sovryn science hypothesis status <hypothesis-id> --json
sovryn science literature ground <study-id> --json
sovryn science next-questions <study-id> --json
sovryn science memory update <study-id> --json
sovryn science memory search "energy anomaly provenance" --json
sovryn science memory report --json
sovryn science campaign run --goal "Run safe computational science studies" --studies 2 --autopublish-corpus --json
sovryn science publish <study-id> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science publish-all --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science study run-real-data energy-anomaly --json
sovryn science reproduce search "data quality anomaly detection reproducibility" --json
sovryn science reproduce plan "safe public energy anomaly detection claim" --json
sovryn science reproduce run <reproduction-id> --json
sovryn science reproduce analyze <reproduction-id> --json
sovryn science reproduce report <reproduction-id> --json
sovryn science reproduce publish <reproduction-id> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science peer-review <study-id> --json
sovryn science peer-review-corpus --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science rebuttal <study-id> --json
sovryn science revise <study-id> --json
sovryn science revision publish <study-id> --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn science meta-analysis run --json
sovryn science memory synthesize --json
sovryn science contradictions find --json
sovryn science stable-findings report --json
sovryn science research-program propose --json
sovryn science next-study plan --json
sovryn science trial run --goal "Perform safe autonomous computational science" --days 7 --studies 6 --real-data-preferred --autopublish-corpus --json
sovryn science study status <study-id> --json
sovryn science review <study-id> --json
```

Science studies write evidence under `.sovryn/science/studies/<study-slug>/`.
Scientific memory writes reusable ledgers under `.sovryn/science/memory/`,
including hypothesis, study, instrument, dataset, result, open-question,
supported-hypothesis, and rejected-hypothesis ledgers.
The alpha review gates block missing null hypotheses, missing baselines, missing
metrics, missing falsification criteria, unsupported scientific claims, and
unsafe wet-lab, hazardous chemistry, exploit-development, biological
optimization, or medical-treatment scopes. Alpha.5 gates also block missing
scientific memory, missing study-bound source cards, missing next questions, and
unsupported literature claims. RC.1 campaign gates additionally require selected
safe questions, completed studies, datasets, instruments, Node Alpha execution,
statistics, baselines, ablations, replication, falsification, paper reports,
public hygiene, safety scope, and curated local package preparation. RC.2
publication gates require public hypotheses, null hypotheses, statistics,
replication, falsification, scientific-memory updates, corpus INDEX/API updates,
and public hygiene before a science study can be written into the corpus.
3.2 Alpha.1 real-data gates require a real-data plan, public-safe dataset
provenance, validation, cache or replay evidence, declared limitations,
real-vs-synthetic comparison, and explicit rejection of private or unsafe data.
3.2 Alpha.2 reproduction gates require extracted claims, extracted methods,
data requirements, metric requirements, a reproduction plan, a reproduction run,
analysis, limitations, safe computational scope, and no overclaimed
reproduction result.
3.2 Alpha.3 peer-review gates require an automated review, review label,
unsupported-claim review, method-weakness recording, author response, revision
plan where needed, and accept/minor-revision status before showcase-science
promotion.
3.2 Alpha.4 meta-analysis gates require meta-analysis artifacts, cross-study
effect summaries, contradiction recording, failed-hypothesis recording, next
research-program proposals, no overgeneralized meta-claims, and explicit
marking of synthetic-only findings as tentative or needing real-data
validation.
The layer is limited to safe computational science over synthetic data, public
non-sensitive data, simulations, statistics, benchmarks, and software
instruments.

See [docs/SCIENTIFIC_METHOD.md](docs/SCIENTIFIC_METHOD.md) for the
computational-science workflow and safety boundaries.

## Current Beta Line

Sovryn OS v3 is now in the Beta operationalization line. The Alpha line built
the Open-Invention Factory, Research Opportunity Engine, Quality Evaluator,
Worker profiles, Corpus memory, public release audits, and beta demo path. The
Beta line proves that those systems can operate together under bounded,
auditable, policy-gated conditions.

The late Alpha milestones were:

| Version          | Focus                             | Result                                                                                                                        |
| ---------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `3.0.0-alpha.21` | Release candidates                | Builds, reviews, and packages human-reviewable Open Invention release candidates.                                             |
| `3.0.0-alpha.22` | Research Quality Evaluator        | Scores Factory runs, Open Inventions, tests, counter-evidence, publication clarity, and corpus uniqueness.                    |
| `3.0.0-alpha.23` | Overnight Operator                | Coordinates opportunity queues, Factory runs, improve cycles, quality evaluation, corpus updates, and morning briefs.         |
| `3.0.0-alpha.24` | Public Corpus Discovery           | Exports curated public corpus data, graph views, duplicate clusters, quality labels, and source summaries.                    |
| `3.0.0-alpha.25` | Security/Reliability/Abuse Audits | Adds repo-level audits for public leaks, unsafe commands, replay consistency, dangerous goals, and fake legal/sandbox claims. |
| `3.0.0-alpha.26` | Beta Prep                         | Adds beta check, beta demo, and beta package commands for a reproducible public demo path.                                    |

Alpha.26 was the first integrated beta-candidate path: release candidates,
quality evaluation, security audit, reliability audit, public corpus export, and
curated beta packaging are all connected.

The current Beta.1-Beta.22 operationalization line builds on Alpha.26:

| Version         | Focus                         | Result                                                                                                                                                                                   |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `3.0.0-beta.1`  | Real Autonomy Validation      | Runs bounded autonomy campaigns, measures success/block/replay/quality rates, and writes autonomy scorecards without real publication.                                                   |
| `3.0.0-beta.2`  | GitHub Publication Governance | Adds publication queue, approval ledger, strict real-publish policy, org/token-scope checks, and dry-run-first release operations.                                                       |
| `3.0.0-beta.3`  | Persistent Node Alpha Worker  | Adds opt-in worker registration, job queues, heartbeat, toolchain policy enforcement, controlled execution, evidence upload, and cleanup.                                                |
| `3.0.0-beta.4`  | Research Quality Benchmarking | Adds a curated benchmark suite for source quality, claim mapping, counter-evidence, prototypes, tests, reproducibility, and safety.                                                      |
| `3.0.0-beta.5`  | Public Corpus Discovery/API   | Exports a public corpus site/API with inventions, sources, quality labels, duplicate clusters, release readiness, and explanation reports.                                               |
| `3.0.0-beta.6`  | Launch Readiness              | Adds launch check/demo/package and pilot run/report flows for public beta or v1.0-RC readiness decisions.                                                                                |
| `3.0.0-beta.7`  | E2E Validation Harness        | Runs a fresh-repo fixture proof from init through beta, autonomy, Factory, worker, publication dry-run, audits, corpus, launch, and report.                                              |
| `3.0.0-beta.8`  | Replay/Launch Stabilization   | Stabilizes replay-critical evidence, separates launch limitations, writes diagnostics, and raises fixture E2E readiness out of degraded.                                                 |
| `3.0.0-beta.9`  | Real Pilot Release Candidates | Builds three human-reviewable Open Invention pilot candidates and validates them through quality, security, replay, corpus, and publication dry-run governance.                          |
| `3.0.0-beta.10` | Corpus Autopublish            | Publishes eligible, policy-gated results into the existing `n57d30top/sovryn-open-inventions` corpus repo without creating new repos or requiring human review.                          |
| `3.0.0-beta.11` | External Research Autopublish | Runs a safe non-Sovryn chemistry-data-quality research campaign, builds `mol-record-auditor`, provisions `pint`, validates through Node Alpha, and corpus-autopublishes if gates pass.   |
| `3.0.0-beta.12` | High-Assurance Tool Execution | Adds a versioned chemistry auditor v2 path that separates package provisioning from final `container-netoff` validation and records worker-assurance evidence before corpus autopublish. |
| `3.0.0-beta.13` | External Energy Research      | Adds `energy-record-auditor`, a safe synthetic energy-data anomaly auditor using policy-provisioned `pandas`, container-netoff validation, and corpus autopublish gates.                 |
| `3.0.0-beta.14` | Multi-Domain Campaign         | Adds a bounded campaign that combines chemistry data quality, energy anomaly auditing, and defensive software patch-risk auditing with custom tools and worker evidence.                 |
| `3.0.0-beta.15` | Anti-Template Quality Gates   | Adds specificity, readability, counter-evidence, non-trivial-test, and corpus-quality audit checks so generic results are rejected or marked for revision.                               |
| `3.0.0-beta.16` | Public Corpus Product Layer   | Builds a readable public corpus site/API, result pages, badges, status summaries, graph export, site audit, and result explanation commands for `sovryn-open-inventions`.                |
| `3.0.0-beta.17` | Overnight External Trial      | Runs a bounded external-domain overnight trial, dry-run or corpus-autopublishes eligible results, and writes a v1-RC gate report.                                                        |
| `3.0.0-beta.18` | Corpus Lifecycle Curation     | Adds lifecycle status, version groups, superseded maps, showcase selection, revision queue reports, and status-aware public corpus exports without deleting old evidence.                |
| `3.0.0-beta.19` | Real-Source External Campaign | Adds a three-domain real-source campaign that uses public-source adapter/cache evidence, source cards, fallback declarations, and real-source autopublish gates.                         |
| `3.0.0-beta.20` | High-Quality Showcase Results | Upgrades three public corpus results with human-readable showcase docs, stricter specificity/anti-template thresholds, reproduction notes, examples, limitations, and site-audit gates.  |
| `3.0.0-beta.21` | Falsification Evaluation      | Adds public-corpus falsification reports, domain-specific negative tests, overclaim checks, and showcase demotion for failed results.                                                    |
| `3.0.0-beta.22` | Public Beta UX and Demo       | Adds public-beta check/demo commands, one-command fixture demo, onboarding docs, install/quickstart guidance, and dry-run-only corpus publication proof for external testers.            |
| `3.0.0-rc.1`    | v1.0-RC Launch Candidate      | Adds stricter v1-RC gate artifacts, public-beta/falsification/corpus-showcase checks, launch-decision evidence, and the real-sources-preferred overnight trial flag.                     |

At `3.0.0-rc.1`, Sovryn can run local autonomy campaigns, build release
candidates, govern publication queues, execute worker jobs, benchmark research
quality, export a public corpus API/site shell, and produce launch/pilot
evidence, then validate the full path through a deterministic fresh-repo E2E
harness. Beta.8 added the replay contract and launch-limitation model. Beta.9
adds a three-pilot release-candidate workflow for evidence-chain, toolchain
policy, and corpus-deduplication Open Inventions. Each pilot is bound to a
Factory run, Open Invention mission, quality evaluation, public-release audit,
reliability replay, publication dry-run intent, corpus entry, release registry
entry, and human review checklist. It still deliberately avoids real autonomous
publication to new GitHub repositories. Beta.10 adds a narrower autonomous
publication path: eligible results may be copied into the existing public
`n57d30top/sovryn-open-inventions` corpus repository only after strict automated
quality, replay, security, safety, hygiene, and reliability gates pass.
Beta.11 uses that path for a non-Sovryn-internal external research proof: a
safe chemistry-style molecular-record data-quality auditor with a custom
prototype tool, policy-reviewed `pint` provisioning, Node Alpha validation, and
curated corpus output.
Beta.12 upgrades that proof with a versioned
`chemistry-record-auditor-tool-v2` result: the provisioning phase records the
external package and version, while final validation prefers `container-netoff`
with network disabled and no silent fallback before autopublish eligibility is
granted.
Beta.13 adds a second external-domain proof:
`energy-usage-anomaly-auditor`, which audits synthetic anonymized energy-style
records for duplicate timestamps, missing intervals, weather-normalized
anomalies, high-usage spikes, and weak provenance. It uses policy-provisioned
`pandas` evidence and remains scoped away from private smart-meter data,
surveillance, and energy-market trading.
Beta.14 adds a third external domain, defensive software supply-chain review,
through `patch-risk-auditor`, and a multi-domain campaign report that compares
chemistry-data quality, energy-data quality, and AI-generated patch-risk
auditing without publishing unsafe operational guidance.
Beta.15 hardens quality scoring and corpus autopublish with anti-template,
readability, prototype-relevance, test-nontriviality, limitation-honesty, and
claim/counter-evidence grounding checks.
Beta.16 turns the public `sovryn-open-inventions` repository into a product
surface: `public-corpus/` now contains static result pages, API JSON, search
metadata, badges, status summaries, graph exports, and an auditable
machine-readable corpus model.
Beta.17 adds the launch-grade overnight external trial:
`sovryn overnight run --goal "<safe external goal>" --max-runs 3 --autopublish-corpus --json`
coordinates external opportunities, custom tools, package evidence, Node Alpha
execution, safety summaries, optional corpus autopublish, and
`sovryn launch v1-rc-check --json` for a final v1-RC gate report.
Beta.18 curates the public corpus without deleting prior outputs: every indexed
result receives a lifecycle status, version group, superseded/supersedes links,
showcase eligibility, revision rationale, human-readable summary, domain, and
result kind. `corpus site build` also writes version-group, superseded,
showcase, and revision-queue aggregates plus `CORPUS_STATUS.md`,
`SHOWCASE_RESULTS.md`, `REVISION_QUEUE.md`, and `VERSIONING.md`.
Beta.19 adds a real-source external research campaign:
`sovryn external-research campaign real-sources --domains 3 --json` runs safe
energy-data-quality, software-supply-chain-assurance, and scientific-dataset
reliability goals through Factory, public-source adapter/cache discovery,
bounded source-card generation, custom tool validation, and corpus autopublish
eligibility checks. Query links, adapter failures, mock placeholders, and
declared fixture fallbacks are never counted as reviewed concrete prior art.
Autopublish is blocked for real-source campaign results unless the result has
at least three concrete-source-bound source cards and the real-source threshold
is recorded as met.
Beta.20 upgrades the public showcase layer. `corpus site build` rewrites the
top three showcase result READMEs for human readers and adds `SHOWCASE.md`,
`METHOD.md`, `REPRODUCE.md`, `LIMITATIONS.md`, and `EXAMPLES.md` per showcase
result. Showcase selection now requires good or excellent quality,
specificity at or above 75, anti-template status `review_ready` or better,
reproducibility at or above 90, publication safety at or above 90, replay
critical pass rate 100, and public hygiene. Results marked `needs_revision` or
superseded stay visible but cannot be promoted.
Beta.21 adds an independent falsification layer:
`sovryn evaluate falsify <result-slug> --target-repo <repo> --json` writes a
per-result `FALSIFICATION.md` and safe synthetic `negative-tests/`, while
`sovryn evaluate falsify-all --target-repo <repo> --json` writes
`aggregate/falsification-report.json` and `aggregate/FALSIFICATION_REPORT.md`.
Falsification checks false-positive and false-negative risks, malformed inputs,
unsupported assumptions, overclaiming language, weak evidence grounding, and
public hygiene. Results that fail falsification move to `needs_revision`,
`overclaims`, or `blocked` status and cannot remain showcase.
Beta.22 adds the public beta onboarding layer:
`sovryn public-beta check --json` verifies Node, build output, docs, worker
doctor evidence, corpus target configuration, safe corpus-autopublish defaults,
and demo evidence. `npm run demo:public-beta` creates a temporary repository,
runs a safe fixture-backed external research flow, validates through Node Alpha,
and prepares corpus autopublish as a dry-run only.

The beta operations line preserves the same operating rules:

- do not weaken gates;
- do not fake research strength;
- do not claim patentability, legal novelty, or freedom-to-operate;
- do not publish raw logs, secrets, private config, local absolute paths, or
  unredacted command journals;
- do not use host `sudo` or host package installation by default;
- do not silently fall back from isolated worker profiles;
- keep real GitHub publication to standalone repositories disabled unless
  explicit strict policy and human approval allow it;
- keep corpus autopublish restricted to the existing `sovryn-open-inventions`
  repository and block it on any critical automated gate failure;
- write evidence for every autonomous workflow;
- keep tests, docs, smoke flows, and reports attached to each milestone.

### What Beta.11-Beta.13 Is And Is Not

Beta.11 is a local, reproducible operating proof that the Sovryn research
factory can leave its own domain, build a custom research tool, provision a
supporting package under policy, validate the prototype with Node Alpha, and
publish only curated results into the existing corpus repo.
Beta.12 keeps the same safe chemistry-data-quality scope but raises the worker
assurance for the v2 result by separating provisioning from final
`container-netoff` validation.
It is meant to show that the factory can coordinate bounded research runs,
evaluate quality, audit outputs, replay critical evidence, resolve launch
blockers, prepare public-reviewable Open Invention release candidates, and copy
eligible results into an existing open corpus repository without creating new
GitHub repositories.

Beta.11-Beta.13 is not a chemistry discovery system, not a synthesis assistant,
not a drug-design system, not hazardous-substance optimization, not private
smart-meter analytics, not surveillance tooling, not energy-market trading, not
an autonomous legal-patent system, not a guarantee of novelty, not a
freedom-to-operate opinion, and not a permissionless autopublisher. Corpus
autopublish does not require human review, but it is limited to
`n57d30top/sovryn-open-inventions` and is blocked by automated gates. Real
publication to newly created or standalone GitHub repositories remains disabled
unless explicit strict policy, approval evidence, and existing Sovryn
publication gates allow it.

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

## Beta Demo Quickstart

Run this in a clean Git repository after building Sovryn:

```bash
node /path/to/sovryn-os-v3/dist/cli.js init --json
node /path/to/sovryn-os-v3/dist/cli.js beta demo --json
node /path/to/sovryn-os-v3/dist/cli.js beta check --json
node /path/to/sovryn-os-v3/dist/cli.js beta package --json
```

The demo creates:

```text
.sovryn/beta/
  beta-demo.json
  beta-check.json
  beta-package.json
  BETA_DEMO.md
  BETA_CHECK.md
  BETA_PACKAGE.md
  package/
```

`beta package` writes only curated summaries and reports. It excludes raw
stdout/stderr, command journals, secrets, private config, local absolute paths,
and full raw source content. The package is review evidence, not publication.

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
sovryn corpus export-public --json
sovryn corpus site build --json
sovryn corpus graph --json
sovryn corpus compare --json
sovryn corpus explain <invention-id> --json
sovryn corpus serve --port 7331 --json
sovryn corpus api export --json
sovryn corpus badges build --json
sovryn corpus graph explain <node-id> --json
sovryn corpus release-notes build --json
sovryn corpus publish-status --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --max-results 10 --json
sovryn external-research run chemistry-record-auditor --json
sovryn release candidates build --max 3 --json
sovryn release candidates review --json
sovryn release candidates package --json
sovryn release registry update --json
sovryn quality evaluate <factory-id> --json
sovryn quality evaluate-invention <mission-id> --json
sovryn quality compare <factory-id-a> <factory-id-b> --json
sovryn quality report --json
sovryn quality leaderboard --json
sovryn overnight plan --goal "Improve autonomous open-source research agents" --json
sovryn overnight run --goal "Improve autonomous open-source research agents" --max-hours 8 --max-runs 1 --json
sovryn overnight status --json
sovryn overnight stop --json
sovryn overnight report --json
sovryn autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
sovryn autonomy campaign run --json
sovryn autonomy campaign status --json
sovryn autonomy campaign report --json
sovryn autonomy scorecard --json
sovryn publication queue --json
sovryn publication review <candidate-id> --json
sovryn publication approve <candidate-id> --json
sovryn publication publish <candidate-id> --dry-run --json
sovryn publication publish <candidate-id> --real --json
sovryn publication audit <candidate-id> --json
sovryn benchmark research run --json
sovryn benchmark research report --json
sovryn benchmark quality calibrate --json
sovryn benchmark compare-baseline --json
sovryn security audit --json
sovryn security audit-public-release .sovryn/factory/<slug>/release/public --json
sovryn security audit-worker --profile container-netoff --json
sovryn reliability audit --json
sovryn reliability replay-all --json
sovryn safety scan-goal "Improve autonomous research agents" --json
sovryn safety scan-release .sovryn/factory/<slug>/release/public --json
sovryn beta check --json
sovryn beta demo --json
sovryn beta package --json
sovryn launch check --json
sovryn launch demo --json
sovryn launch package --json
sovryn pilot run --scenario evidence-chain --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
sovryn e2e doctor --json
sovryn e2e run --profile beta-fixture --release-candidates 3 --json
sovryn e2e report --json
sovryn worker doctor --profile container-local --json
sovryn worker doctor --profile container-netoff --json
sovryn worker doctor --all --json
sovryn worker policy check --json
sovryn worker register alpha --json
sovryn worker jobs list --json
sovryn worker jobs run <job-id> --profile container-netoff --json
sovryn worker jobs status <job-id> --json
sovryn worker jobs cleanup <job-id> --json
sovryn worker heartbeat --json
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
- Audits generated public releases, worker posture, command evidence, corpus
  exports, and replay consistency through security/reliability commands.
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

Alpha.24 adds a curated public corpus discovery export:

```bash
sovryn corpus export-public --json
sovryn corpus site build --json
sovryn corpus graph --json
sovryn corpus compare --json
sovryn corpus explain <invention-id> --json
```

The export writes `.sovryn/corpus/public/` with public summaries for inventions,
sources, source cards, claim features, release candidates, quality scores,
duplicate-risk clusters, and a corpus graph. It also writes a small
`public-corpus/` static shell when `corpus site build` is used. Public corpus
gates reject raw logs, local absolute paths, secret-like values, private config,
and uncurated files.

Beta.10 adds autonomous corpus publication into the existing public repository
`https://github.com/n57d30top/sovryn-open-inventions`:

```bash
sovryn corpus publish-status --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --max-results 10 --json
```

Corpus autopublish is intentionally narrow. It publishes to the existing corpus
repo only, never creates new GitHub repositories, and does not expose tokens.
Human review is not required for this corpus path, but automated gates are
strict: quality must be `good` or `excellent`, candidate status must be
`dry_run_ready` or `review_ready`, evidence strength must be at least 80,
reproducibility at least 90, publication safety at least 85, replay-critical
pass rate must be 100, security/safety/reliability/public-hygiene checks must
pass, and publication dry-run evidence must exist. Any raw logs, stdout/stderr
fields, secrets, local absolute paths, private config, dangerous content, or
fake patentability/freedom-to-operate claims block commit and push.

Beta.11 adds an external research proof run:

```bash
sovryn external-research run chemistry-record-auditor --json
```

That run frames the problem as safe chemistry-style data quality, builds
`mol-record-auditor`, provisions `pint` under toolchain policy in an isolated
prototype environment, runs the prototype/tests through Node Alpha, writes
quality/safety/replay/publication evidence, and then leaves the result eligible
for `corpus autopublish` only when automated gates pass. It does not generate
synthesis instructions, wet-lab protocols, drug-design advice, hazardous
optimization, or legal patent opinions.

Beta.12 adds the high-assurance v2 path:

```bash
sovryn external-research run chemistry-record-auditor --profile container-netoff --json
```

The v2 flow writes `chemistry-record-auditor-v2/` evidence, verifies the
package-bound output through `container-netoff` with network disabled, records a
worker-assurance report, and prepares the versioned corpus slug
`chemistry-record-auditor-tool-v2`. If `container-netoff` is unavailable or
silently falls back, the run is degraded and cannot be treated as high
assurance.

Beta.13 adds a second external-domain run:

```bash
sovryn external-research run energy-record-auditor --profile container-netoff --json
```

The energy flow writes `energy-usage-anomaly-auditor/` evidence, provisions
`pandas`, validates a synthetic anonymized dataset through `container-netoff`,
and prepares the public corpus slug `energy-usage-anomaly-auditor` only if
automated quality, replay, safety, public-hygiene, and no-silent-fallback gates
pass. It does not use private smart-meter data, personal identifiers,
surveillance logic, or energy-market trading advice.

Beta.19 adds a real-source external campaign:

```bash
sovryn external-research campaign real-sources --domains 3 --json
```

The campaign covers safe energy-data quality, software-supply-chain assurance,
and scientific dataset reliability goals. It enables public-source search and
source reading, writes `real-source-search.json`, source-card files,
claim/feature matrices, counter-evidence, experiment plans, and benchmark plans
for each domain, then binds those artifacts to the generated pilot and
Open-Invention records.

The deterministic test mode is explicit:

```bash
sovryn external-research campaign real-sources --domains 3 --fixture-sources --json
```

Fixture adapter sources simulate concrete public-source results for CI.
Declared fallback sources are different: they are marked `fixture_fallback`,
are not reviewed as prior art, and degrade the result. Corpus autopublish adds
real-source gates and rejects a real-source campaign result unless concrete
source-card thresholds are met.

Beta.14 adds a bounded multi-domain campaign:

```bash
sovryn external-research campaign multi-domain --fixture-install --json
```

The campaign covers chemistry-style data quality, synthetic energy anomaly
auditing, and defensive patch-risk auditing. The supply-chain domain uses
`patch-risk-auditor` with policy-provisioned `acorn` evidence against synthetic
toy patch examples only. It does not operate against real systems, generate
harmful code, or publish unsafe payloads.

Beta.15 adds anti-template and corpus quality audit commands:

```bash
sovryn quality anti-template patch-risk-auditor --json
sovryn quality readability patch-risk-auditor --json
sovryn corpus quality-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

These checks keep generic, repetitive, shallow, or weakly grounded results out
of corpus autopublish. Existing demo-style results can remain in the corpus, but
they are reported as `demo_pilot` or `needs_revision` when specificity is weak.

Beta.16 adds product-layer corpus site commands for the existing public corpus
repo:

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus explain-result chemistry-record-auditor-tool-v2 --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

The site build writes `public-corpus/index.html`, result pages under
`public-corpus/results/`, JSON API files under `public-corpus/api/`, badge
metadata, search indexes, and aggregate status/domain/graph summaries. The site
audit blocks raw logs, secrets, local paths, private config, unsafe content, and
fake legal claims before the product layer is pushed.

Beta.17 adds a bounded overnight external research trial and v1-RC gate:

```bash
sovryn overnight run \
  --goal "Generate safe external open inventions" \
  --max-runs 3 \
  --autopublish-corpus \
  --real-sources-preferred \
  --json
sovryn launch v1-rc-check --json
```

The trial keeps publication restricted to the existing corpus repo, records
dangerous-goal blocks, package/tool evidence, worker no-silent-fallback
evidence, quality and safety summaries, and a morning brief. Real standalone
GitHub repo creation remains disabled.

Beta.18 adds lifecycle-aware public corpus curation:

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

The build keeps all old result folders, but updates `INDEX.json`,
`public-corpus/`, and aggregate reports with `demo_pilot`, `draft`,
`dry_run_ready`, `autopublished`, `showcase`, `needs_revision`, `superseded`,
and `blocked` lifecycle statuses. The best current results are listed in
`aggregate/showcase-results.json` and `SHOWCASE_RESULTS.md`; weak or
template-like results stay visible but move to revision or demo status instead
of being hidden.

Beta.20 turns the selected showcase entries into human-readable public results:

```bash
sovryn corpus site build --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus site audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

For the three selected showcase results, the build writes `SHOWCASE.md`,
`METHOD.md`, `REPRODUCE.md`, `LIMITATIONS.md`, and `EXAMPLES.md`, and rewrites
the result README with a clear problem statement, method, custom tool, tests,
source evidence summary, counter-evidence/limitations, reproduction path,
autopublish record, and safety scope. The audit enforces readable showcase
docs, reproduction instructions, examples, limitations, anti-template readiness,
specificity thresholds, and public site links.

Beta.21 adds independent falsification before showcase results stay promoted:

```bash
sovryn evaluate falsify chemistry-record-auditor-tool-v2-v2 --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn evaluate falsify-all --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
```

Each evaluated result receives `FALSIFICATION.md` and `negative-tests/` with
safe synthetic counter-cases. The aggregate falsification report is public, and
`corpus site build` exports each result's `falsificationStatus`. Failed
falsification removes showcase eligibility rather than hiding the result.

Autopublish writes `.sovryn/corpus-autopublish/` with
`autopublish-plan.json`, `AUTOPUBLISH_PLAN.md`, `rejected-results.json`, and
`REJECTED_RESULTS.md`. A real run updates `results/<slug>/`, `INDEX.json`,
`VERIFICATION.md`, and aggregate ledgers in the target corpus repo, then commits
and pushes only if all final checks pass.

## Security and Reliability Audits

Alpha.25 adds repo-level audit commands:

```bash
sovryn security audit --json
sovryn security audit-public-release .sovryn/factory/<slug>/release/public --json
sovryn security audit-worker --profile container-netoff --json
sovryn reliability audit --json
sovryn reliability replay-all --json
sovryn safety scan-goal "Improve autonomous research agents" --json
sovryn safety scan-release .sovryn/factory/<slug>/release/public --json
```

The audit layer checks generated public release roots, public corpus exports,
release-candidate packages, worker doctor output, and generated command
evidence. It blocks obvious command-injection patterns, unsafe installers,
host `sudo`, raw stdout/stderr files or fields, local absolute paths,
secret-like values, fake sandbox guarantees, fake patentability language,
dangerous research goals, replay-all failures, public corpus leaks, and release
registry inconsistencies. Audit reports are written under `.sovryn/audits/` and
are ignored by default.

Audits do not publish anything and they do not replace Factory, Quality, Worker,
Open Invention, secret, replay, final verification, or GitHub publication gates.

## Beta Prep

Alpha.26 adds beta-readiness commands:

```bash
sovryn beta demo --json
sovryn beta check --json
sovryn beta package --json
```

`beta demo` runs a reproducible local demo using the release-candidate workflow,
quality evaluator, public corpus export/site shell, security audit, and
reliability audit. `beta check` evaluates beta gates such as docs completeness,
demo evidence, security/reliability pass state, release candidates, public
corpus export, legal-language safety, and test-count minimums. `beta package`
creates a curated `.sovryn/beta/package/` with summary JSON and reports only.

The beta package is a public demo bundle and still requires human review before
real publication. Sovryn produces Open Inventions, Defensive Publications, and
Open Source Research Artifacts; it does not file legal patents or provide legal
novelty, patentability, or freedom-to-operate opinions.

## Public Beta

Beta.22 adds a tester-facing public beta path:

```bash
npm install
npm run build
node dist/cli.js public-beta check --json
npm run demo:public-beta
```

`public-beta check` verifies the local Node version, built CLI, public beta
docs, worker doctor evidence, corpus repo configuration, safe corpus
autopublish defaults, and whether a public beta demo has passed.
`npm run demo:public-beta` creates a temporary repository, runs a safe
fixture-backed external research flow, validates the generated prototype through
Node Alpha, and prepares corpus autopublish as a dry-run only. It does not push
to GitHub.

Public beta onboarding docs:

- `docs/GETTING_STARTED_PUBLIC_BETA.md`
- `docs/INSTALL.md`
- `docs/QUICKSTART.md`
- `docs/WHAT_SOVRYN_IS.md`
- `docs/WHAT_SOVRYN_IS_NOT.md`
- `docs/RUN_EXTERNAL_RESEARCH.md`
- `docs/CORPUS_AUTOPUBLISH.md`
- `docs/NODE_ALPHA.md`

## Beta Operations

Beta.1 through Beta.13 add operational proof workflows around the Alpha factory.
They are local Evidence workflows: they measure autonomy, govern publication
queues, coordinate worker jobs, benchmark research quality, export a public
corpus API, package launch/pilot evidence, and validate the whole path with a
fresh-repo E2E harness. Beta.11 adds policy-gated publication into the existing
`sovryn-open-inventions` corpus repo only. It does not create new repos and it
blocks on automated gate failure. Beta.12 adds the versioned
`container-netoff` chemistry-auditor v2 proof. Beta.13 adds the synthetic
energy-data anomaly auditor as a second external-domain proof.

```bash
sovryn autonomy campaign plan --goal "Improve autonomous open-source research agents" --runs 10 --json
sovryn autonomy campaign run --json
sovryn publication queue --json
sovryn publication publish <candidate-id> --dry-run --json
sovryn worker register alpha --json
sovryn worker jobs list --json
sovryn benchmark research run --json
sovryn corpus api export --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
sovryn launch check --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
sovryn e2e run --profile beta-fixture --release-candidates 3 --json
```

Operational artifacts are written under:

```text
.sovryn/autonomy/
.sovryn/publication/
.sovryn/workers/alpha/
.sovryn/benchmarks/
.sovryn/launch/
.sovryn/pilots/
.sovryn/e2e/
public-corpus/api/
```

Publication Governance is dry-run-first. Real publication remains disabled by
default through `publication.allowAutonomousPublish: false`, requires explicit
approval evidence, and still goes through Sovryn quality, security,
reliability, Open Invention, and GitHub publication gates. GitHub credentials
remain controller-owned and are never written to public artifacts.

Corpus autopublish is separate from standalone GitHub publication. It writes
eligible results into the existing public corpus repo only, with
`humanReviewRequired: false`, `createNewRepos: false`, hard thresholds, and
public hygiene scans before commit and push.

## Launch And Pilot Readiness

Beta.6 added the launch-readiness layer for public beta or v1.0-RC review.
Beta.9 adds the three-pilot release-candidate proof on top of that launch path:

```bash
sovryn launch check --json
sovryn launch demo --json
sovryn launch package --json
sovryn pilot run --all --json
sovryn pilot review --json
sovryn pilot package --json
```

Launch evidence is written under `.sovryn/launch/`; pilot release-candidate
evidence is written under `.sovryn/pilots/`:

```text
.sovryn/launch/
  launch-check.json
  launch-demo.json
  launch-package.json
  pilot-results.json
  LAUNCH_READINESS.md
  PILOT_REPORT.md

.sovryn/pilots/
  pilot-index.json
  pilot-results.json
  pilot-quality-summary.json
  pilot-publication-summary.json
  PILOT_REPORT.md
  PILOT_REVIEW.md
  PILOT_RELEASE_CANDIDATES.md
  <pilot-id>/
    pilot-run.json
    opportunity.json
    factory-binding.json
    mission-binding.json
    quality-evaluation.json
    security-audit.json
    reliability-replay.json
    publication-review.json
    publication-dry-run.json
    corpus-entry.json
    human-review-checklist.json
    HUMAN_REVIEW_CHECKLIST.md
  public/
```

The launch flow aggregates beta demo evidence, release-candidate evidence,
security audit evidence, reliability replay evidence, public corpus export
evidence, and pilot results. It does not publish to GitHub. It is a readiness
decision workflow for humans and policy, not an automatic release switch.

The built-in Beta.9 pilot scenarios are:

- evidence-chain format for replayable autonomous research-agent records;
- policy-gated toolchain installation on Linux research nodes;
- corpus deduplication for defensive publications.

Each pilot should produce an Opportunity, Factory run, source evidence, claim
matrix, counter-evidence, prototype/tests, worker execution or unavailable
worker evidence, replay, quality evaluation, audit evidence, release candidate,
corpus entry, and public demo bundle.

## End-to-End Validation

Beta.9 and Beta.11 run the deterministic fixture-backed validation harness in
multi-candidate mode:

```bash
sovryn e2e doctor --json
sovryn e2e run --profile beta-fixture --release-candidates 3 --json
sovryn e2e report --json
```

The E2E runner creates a fresh temporary Git repository and invokes the built
`dist/cli.js` through the same public CLI surface a user would run. It verifies
the path from initialization through beta demo/check/package, autonomy campaign,
Factory/Open-Invention packaging, worker/Node Alpha validation, benchmark and
quality reporting, publication governance dry-run, security/reliability/safety
audits, corpus export, launch, and pilot reports.

E2E artifacts are written under `.sovryn/e2e/`:

```text
.sovryn/e2e/
  build-sanity.json
  fresh-repo-init.json
  beta-flow.json
  autonomy-flow.json
  factory-flow.json
  worker-flow.json
  quality-benchmark-flow.json
  publication-flow.json
  audit-safety-flow.json
  corpus-flow.json
  launch-pilot-flow.json
  e2e-run.json
  e2e-events.jsonl
  e2e-command-results.json
  e2e-artifacts.json
  e2e-scorecard.json
  e2e-failures.json
  replay-contract.json
  replay-diagnostics.json
  launch-limitations.json
  E2E_REPORT.md
  REPLAY_DIAGNOSTICS.md
  LAUNCH_LIMITATIONS.md
  E2E_ARTIFACT_TREE.md
  E2E_RISK_REGISTER.md
```

The harness blocks or degrades the scorecard for critical public leaks,
unexpected real publication, silent container-to-host fallback, missing Factory
runs, missing release candidates, unavailable worker profiles, stale
replay-critical evidence, blocking launch limitations, and unsafe safety-scan
results. It does not require public network access in `beta-fixture` mode and
does not perform real GitHub publication.

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

## Autonomous Overnight Operator

Alpha.23 adds an overnight operating mode above the Opportunity Engine, Factory
Mode, Quality Evaluator, Worker evidence, Corpus Memory, and release packaging.
It is a coordinator, not a publisher: it can plan a bounded work session, build
an opportunity queue, execute selected Factory runs, evaluate quality, run
bounded improve cycles for weak runs, replay evidence, package curated public
Factory evidence when quality passes, update the corpus, and write a morning
brief.

```bash
sovryn overnight plan --goal "Improve autonomous open-source research agents" --json
sovryn overnight run --goal "Improve autonomous open-source research agents" --max-hours 8 --max-runs 1 --json
sovryn overnight status --json
sovryn overnight report --json
sovryn overnight stop --json
```

Overnight artifacts are written under `.sovryn/overnight/`:

```text
.sovryn/overnight/
  overnight-plan.json
  overnight-run.json
  overnight-events.jsonl
  overnight-budget.json
  overnight-decisions.json
  overnight-results.json
  OVERNIGHT_REPORT.md
  MORNING_BRIEF.md
```

The operator enforces max runs, improve-cycle limits, worker-execution limits,
high-safety-risk stops, corpus updates, and no-real-publication guarantees. It
does not publish to GitHub, does not install host tools, does not override
Factory or Quality gates, and does not make legal patentability, legal novelty,
or freedom-to-operate conclusions.

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

Launch readiness and pilot flows are documented in
`docs/LAUNCH_READINESS.md` and `examples/launch-demo/`.
