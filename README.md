# Sovryn OS v3

Current version: `4.2.0-rc.1`

Sovryn OS is a local-first evidence kernel for AI-assisted coding and research.
It runs work in isolated Git worktrees, verifies outcomes through exit codes,
records artifacts, applies policy gates, and requires review before finalizing
changes.

It is also an evidence-bound open-source research system. Sovryn can discover
research opportunities, run Factory Mode, generate Open Invention release
candidates, evaluate research quality, run bounded computational-science
studies, build and audit lab toolchains, route safe knowledge targets through
domain-specific evidence paths, publish curated corpus artifacts, and execute
frontier scientific production trials.

> Agents act. Sovryn verifies. Git isolates. Policy gates. Evidence persists.
> Humans approve.

Sovryn produces Open Inventions, Defensive Publications, and Open Source
Research Artifacts. It does not file legal patents and does not provide legal
novelty, patentability, or freedom-to-operate opinions.

## Status

`4.2.0-rc.1` adds Frontier Scientific Production:

- verified benchmark expansion for provenance-aware data-quality methods,
- 1000-candidate method generation and top-20 implementation,
- baseline-dominance falsification against strong baselines,
- independent replication variants for surviving candidates,
- paper-grade result packages,
- curated public-corpus publication for eligible frontier trials.

The current system remains intentionally bounded. It supports safe computational
science over source-linked public data, proxy data, synthetic data, simulations,
benchmarks, statistics, and software instruments. Claims are limited to the
evidence Sovryn records.

Traceability covers data quality and anomaly detection tasks.
External computational claim checks record method, data, metrics, substituted data,
confidence, and source-card summaries.
No breakthrough label is forced.

The current Open Verifiable Science OS line has reached an internal
`open_verifiable_science_os_v1_6_candidate` status. This is a bounded
release-candidate capability label, not a claim of external adoption, broad
acceleration, discovery validation, or universal scientific coverage.

OS v1.6 adds capability completion and hardening for the cross-domain evidence
router:

- class-level capability status and no-fake-100 gates,
- temporal v2 validation with stricter scope and replay checks,
- deeper repo/package reproduction tiers,
- formal counterexample and proof-route hardening,
- public package replay coverage,
- route policy stability checks across fresh targets,
- final capability audits and release-candidate packaging.

Release-grade or release-grade-with-caveats classes:

- `claim_review`
- `tool_usefulness`
- `dataset_audit`
- `benchmark_protocol_audit`
- `scientific_public_data_triage`
- `repo_package_reproduction`
- `formal_counterexample`
- `temporal_evaluation`

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Quickstart

Sovryn OS v3 requires Node.js 22 or newer.

```bash
npm install
npm run build
npm test
node dist/cli.js init --json
```

Run the public-beta proof path:

```bash
npm run demo:public-beta
```

Public Beta review uses `public-beta check`, `public-beta demo`, corpus
`publish-audit`, and the existing `pilot run --all` flow to verify curated
corpus evidence before any launch decision.

Run the current frontier production path:

```bash
node dist/cli.js frontier benchmark expand --json
node dist/cli.js frontier candidates generate --json
node dist/cli.js frontier baseline-dominance run --json
node dist/cli.js frontier replication run --json
node dist/cli.js frontier package build --json
node dist/cli.js frontier trial run --autopublish-corpus --json
```

Inspect the current OS v1.6 capability layer:

```bash
node dist/cli.js os capability-status --json
node dist/cli.js os capability-audit --json
node dist/cli.js os replay-coverage --json
node dist/cli.js route policy-v4-audit --json
node dist/cli.js temporal v2-audit --json
node dist/cli.js repo deep-audit --json
node dist/cli.js formal proof-route-audit --json
```

If installed globally or linked, use `sovryn` instead of `node dist/cli.js`.

## What Sovryn Does

Sovryn is designed around verifiable local evidence rather than trusted agent
output.

Core kernel:

- creates missions and isolated Git worktrees,
- runs fake, shell, Codex, or SSH-backed attempts through runner adapters,
- discovers and executes verification commands,
- records journals, diffs, verification output, reviews, and artifact hashes,
- blocks finalization through policy, secret scans, and review checks.

Research factory:

- scans and ranks research opportunities,
- creates Open Invention and Factory Mode artifacts,
- generates source cards, claim-feature matrices, prototypes, and tests,
- evaluates quality, readability, novelty gaps, and falsification evidence,
- packages curated public-safe research outputs.

Science and lab system:

- creates questions, hypotheses, null hypotheses, study designs, baselines,
  metrics, falsification criteria, and replication plans,
- binds safe public/proxy datasets with provenance and replay evidence,
- builds, tests, calibrates, benchmarks, and retires computational instruments,
- composes reproducible lab pipelines,
- maintains scientific memory, lab memory, claim graphs, method atlases, and
  next-best-experiment queues.

Operational layer:

- runs overnight operator cycles,
- governs publication queues,
- executes worker jobs,
- audits security and reliability evidence,
- runs public beta, launch, pilot, end-to-end, reality-grade, field-grade, and
  frontier-grade trial workflows.

Cross-domain OS layer:

- classifies safe public targets by evidence route,
- applies minimum evidence policies and quick-reject rules,
- dispatches repo, dataset, benchmark, temporal, formal, claim-review, and
  tool-usefulness targets to the appropriate route,
- scores evidence completeness, package quality, replay coverage, and class
  capability status,
- publishes only public-safe packages with limitations and reproducibility
  notes.

## Architecture

The core architecture is intentionally small:

- `src/core/mission` manages mission lifecycle and state.
- `src/core/workspace` creates and removes Git worktrees.
- `src/core/runner` adapts execution backends behind one interface.
- `src/core/verify` discovers and runs verification by exit code.
- `src/core/policy` blocks unsafe or unreviewed finalization.
- `src/core/review` binds diff, verification, policy, and artifact evidence.
- `src/core/storage` persists local state under `.sovryn/` by default.
- `src/plugins` loads optional trusted plugin packages.

Finalize is the only default workflow that mutates the base working tree. It
re-runs verification, checks the stored review against the current diff and
verify outcome hash, evaluates policy, scans for secrets, commits the mission
worktree branch, and fast-forwards the configured base branch.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture
summary.

## Command Families

The CLI returns stable machine-readable envelopes when run with `--json`.

| Area                   | Example commands                                                                             | Purpose                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Mission kernel         | `init`, `spawn`, `verify`, `review`, `approve`, `finalize`                                   | Local worktree-based agent execution and gated finalization.                      |
| Open Inventions        | `invent-open`, `factory-open`, `invention`, `publish-github`                                 | Evidence-bound invention dossiers and defensive-publication packages.             |
| Factory Mode           | `factory plan`, `factory run`, `factory review`, `factory package`, `factory replay`         | Autonomous research factory runs with replay and review artifacts.                |
| Research operations    | `research scan`, `autonomy campaign`, `publication queue`, `worker jobs`                     | Opportunity queues, campaigns, governance, and persistent workers.                |
| Public corpus          | `corpus index`, `corpus graph`, `corpus autopublish`, `corpus site audit`                    | Curated corpus indexing, explainability, publication, and static/API outputs.     |
| Science                | `science question`, `science experiment run`, `science reproduce`, `science trial run`       | Hypothesis-driven computational-science studies and reproductions.                |
| Lab                    | `lab needs`, `lab provision`, `lab instrument`, `lab pipeline`, `lab trial run`              | Toolchain, instrument, and reproducible pipeline workflows.                       |
| Knowledge              | `knowledge graph`, `knowledge confidence`, `knowledge contradictions`, `knowledge trial run` | Evidence-bound claim graph, confidence scoring, contradictions, and method atlas. |
| Reality/field/frontier | `reality-grade trial`, `field-grade trial`, `frontier trial`                                 | Increasingly strict autonomous-science trial workflows.                           |
| Cross-domain OS        | `route intake`, `route execute`, `os capability-status`, `os capability-audit`               | Evidence routing, package replay, class capability, and OS readiness checks.      |
| Domain packs           | `temporal v2-audit`, `repo deep-audit`, `formal proof-route-audit`                           | Hardened domain-specific evidence routes used by the OS layer.                    |
| Audits and readiness   | `security audit`, `reliability audit`, `public-beta check`, `launch v1-rc-check`, `e2e run`  | Safety, replay, beta, launch, pilot, and end-to-end gates.                        |
| Plugins                | `plugin list`, `plugin run`                                                                  | Optional trusted extensions.                                                      |

Print the full command list with:

```bash
node dist/cli.js --help
```

## JSON Contract

Commands with `--json` return a consistent envelope:

```json
{
  "ok": true,
  "command": "mission.verify",
  "version": "4.2.0-rc.1",
  "timestamp": "2026-05-06T00:00:00.000Z",
  "data": {},
  "warnings": [],
  "errors": [],
  "artifactRefs": []
}
```

Human output may change. JSON envelopes are the machine contract.

See [docs/JSON_ENVELOPES.md](docs/JSON_ENVELOPES.md).

## Artifact Roots

Sovryn writes local evidence under `.sovryn/`. Common roots include:

| Path                  | Contents                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `.sovryn/missions/`   | Mission state, journals, reviews, verification evidence.                                 |
| `.sovryn/worktrees/`  | Isolated Git worktrees for mission attempts.                                             |
| `.sovryn/factory/`    | Factory plans, runs, reviews, packages, replay evidence.                                 |
| `.sovryn/inventions/` | Open Invention dossiers, prototype evidence, publication reviews.                        |
| `.sovryn/corpus/`     | Local corpus index, graph, export, publication status, audit output.                     |
| `.sovryn/science/`    | Studies, hypotheses, experiments, memory, source cards, reproductions.                   |
| `.sovryn/lab/`        | Lab needs, decisions, provisioning, instruments, pipelines, memory.                      |
| `.sovryn/knowledge/`  | Claim graphs, confidence, contradictions, method atlas, experiment queues.               |
| `.sovryn/frontier/`   | Benchmark expansion, method factory, falsification, replication, paper packages, trials. |
| `.sovryn/route/`      | Cross-domain target classification, route plans, execution results, and route audits.    |
| `.sovryn/os-v1_6/`    | OS v1.6 capability status, class hardening, replay coverage, and final audit artifacts.  |
| `.sovryn/audits/`     | Security, reliability, replay, and safety-scope audit evidence.                          |

Generated artifacts are intended for review and replay. Curated publication
workflows copy only public-safe evidence into release or corpus outputs.

## Plugins

Plugins are optional trusted Node.js extensions. The core does not import
domain-specific plugins by default.

Enable plugins with `.sovryn/plugins.json`:

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

The repository includes `packages/sovryn-plugin-gitnexus`, which shells out to a
local `gitnexus` command or `SOVRYN_GITNEXUS_COMMAND`.

See [docs/PLUGIN_API.md](docs/PLUGIN_API.md).

## Safety Boundaries

Sovryn OS is not:

- a patent filing system,
- a patentability or freedom-to-operate opinion,
- a legal novelty opinion,
- a chemical synthesis assistant,
- an exploit-development system,
- a medical-treatment system,
- a blind LLM wrapper,
- an autopublish-anything bot,
- a global acceleration proof,
- an external-adoption claim.

Publication is dry-run-first and policy-gated. Public corpus publication is
allowed only for curated public-safe outputs and only after automated hygiene,
safety, and evidence gates pass.

See [docs/SAFETY_POLICY.md](docs/SAFETY_POLICY.md),
[docs/PUBLICATION_POLICY.md](docs/PUBLICATION_POLICY.md), and
[docs/WHAT_SOVRYN_IS_NOT.md](docs/WHAT_SOVRYN_IS_NOT.md).

## Documentation

Start here:

- [docs/INSTALL.md](docs/INSTALL.md)
- [docs/QUICKSTART.md](docs/QUICKSTART.md)
- [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/WHAT_SOVRYN_IS.md](docs/WHAT_SOVRYN_IS.md)
- [docs/WHAT_SOVRYN_IS_NOT.md](docs/WHAT_SOVRYN_IS_NOT.md)

Workflow docs:

- [docs/OPEN_INVENTIONS.md](docs/OPEN_INVENTIONS.md)
- [docs/FACTORY_MODE.md](docs/FACTORY_MODE.md)
- [docs/RESEARCH_FACTORY.md](docs/RESEARCH_FACTORY.md)
- [docs/SCIENTIFIC_METHOD.md](docs/SCIENTIFIC_METHOD.md)
- [docs/SELF_BUILDING_LAB.md](docs/SELF_BUILDING_LAB.md)
- [docs/SCIENTIFIC_KNOWLEDGE_ENGINE.md](docs/SCIENTIFIC_KNOWLEDGE_ENGINE.md)
- [docs/REALITY_GRADE_SCIENTIFIC_AUTONOMY.md](docs/REALITY_GRADE_SCIENTIFIC_AUTONOMY.md)
- [docs/FIELD_GRADE_AUTONOMOUS_SCIENCE.md](docs/FIELD_GRADE_AUTONOMOUS_SCIENCE.md)
- [docs/FRONTIER_SCIENTIFIC_PRODUCTION.md](docs/FRONTIER_SCIENTIFIC_PRODUCTION.md)
- [docs/FRONTIER_PRODUCTION_TRIAL.md](docs/FRONTIER_PRODUCTION_TRIAL.md)

Operations and audit docs:

- [docs/CORPUS.md](docs/CORPUS.md)
- [docs/CORPUS_AUTOPUBLISH.md](docs/CORPUS_AUTOPUBLISH.md)
- [docs/REPRODUCTION_AND_FALSIFICATION.md](docs/REPRODUCTION_AND_FALSIFICATION.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/AUDITS.md](docs/AUDITS.md)
- [docs/REPLAY_CONTRACT.md](docs/REPLAY_CONTRACT.md)
- [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md)
- [docs/PLUGIN_API.md](docs/PLUGIN_API.md)

## Development

```bash
npm run build
npm test
npm run format:check
git diff --check
```

The CI-equivalent local test path is `npm test`. It builds TypeScript and then
runs the compiled Node test suite under `dist/tests/*.test.js`.

## License

MIT. See [LICENSE](LICENSE).
