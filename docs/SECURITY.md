# Security

Sovryn OS defaults to local isolation and evidence hygiene.

Rules:

- Worktrees are enabled by default.
- Password SSH is not implemented. The SSH runner uses `BatchMode=yes`,
  disables password and keyboard-interactive authentication, and expects SSH
  agent or identity-file based auth.
- Secrets in CLI args are forbidden by policy and redaction checks.
- Mission prompts, logs, stdout, stderr, and artifacts are redacted before
  persistence.
- Finalize scans diff text, changed text-file contents, and mission artifacts
  for common token, password, API key, private key, and bearer token patterns.
- Finalize re-runs verify immediately before merging.
- Finalize requires a current review by default. The stored review must match the
  current diff hash and verify outcome hash.
- Approvals are bound to the diff hash and verify outcome hash that were current
  at approval time. If the diff or verify outcome changes, the approval no longer
  satisfies policy. Sovryn also stores a stricter verify evidence hash for audit.
- Missing verification commands fail verification with `NO_VERIFY_COMMANDS`.
- Blocked paths cannot be finalized.
- Sensitive paths raise risk and require approval.
- Dependency and CI changes require approval.
- Runner and verify commands block common network commands when
  `policy.allowNetwork` is false.

Allowed future remote authentication patterns:

- SSH agent
- Identity file
- Environment secret with redaction
- Vault or `secret-command` hook

The v3 core includes an SSH runner for controlled remote execution. It is blocked
unless `policy.allowNetwork` is true and it never accepts password arguments.

Network policy is best-effort. Sovryn blocks common network tools and sets proxy
variables to a local deny endpoint, but it is not a kernel-level sandbox. Scripts
that open sockets through another runtime may still need OS-level isolation. For
strong no-network guarantees, run Sovryn in a container, network namespace,
`firejail`/`nsjail`-style runtime, or CI environment with network disabled.

Mission and research evidence can still contain sensitive project context after
redaction. `sovryn init` adds local evidence, cache, node, factory, opportunity,
and adapter directories under `.sovryn/` to `.gitignore`. Only remove those
ignores when the project intentionally publishes evidence and memory artifacts.

The Autonomous Open Research Factory separates autonomous research artifacts
from publication. Factory runs may generate dossiers, prototypes, tests, scores,
and public evidence packages, but real GitHub publication still goes through
Sovryn Controller and existing publication gates. Factory public packaging uses
an allowlist of curated summaries and rejects raw command logs in
`release/public/`. Secret scanning is applied to public factory evidence.

Node Alpha participation remains bounded. The local MVP can prepare and verify
research artifacts, but it is not a host security sandbox. Use a dedicated user,
container, VM, firewall, or network namespace before granting broad autonomous
execution on a real research machine.

Factory Alpha.13 added a `sandbox-local` execution profile for generated
prototype validation:

```bash
sovryn node run alpha <mission-id> --mode validate --profile sandbox-local --json
```

Factory runs also use the same profile internally for generated prototype
execution evidence. The profile runs only inside the generated prototype
directory, allows only the generated prototype test commands, rejects shell
metacharacters, blocks network/publication commands through the existing command
policy, records redacted stdout/stderr, and writes summary-only public evidence.

`sandbox-local` is not a kernel-level sandbox. It does not provide process,
filesystem, syscall, or network isolation by itself. Treat it as a constrained
command profile suitable for Alpha evidence collection. For strong isolation,
pair Node Alpha with a container, VM, dedicated Linux user, firewall rules, or a
future `sovryn-agentd` backend.

Factory Alpha.14 adds a `container-local` worker profile:

```bash
sovryn worker doctor --profile container-local --json
sovryn node run alpha <mission-id> --mode validate --profile container-local --json
```

The doctor checks Docker and Podman availability without exposing credentials.
When a runtime is available, Node Alpha can run generated prototype validation
inside a container profile with network disabled where supported and only the
prototype workspace mounted. When no runtime is available, the profile returns a
clear unavailable/degraded result and does not silently fall back to host
execution. `container-local` is sandbox-ready infrastructure, not a legal or
formal proof of isolation. Use a hardened VM, container policy, dedicated user,
firewalling, and secret isolation for stronger guarantees.

Alpha.19 adds the secure worker runtime profile set:

```bash
sovryn worker doctor --all --json
sovryn worker doctor --profile container-netoff --json
sovryn worker policy check --json
sovryn node run alpha <mission-id> --mode validate --profile container-netoff --json
sovryn worker run <mission-id> --profile container-netoff --json
```

The profiles are explicit about assurance:

- `sandbox-local`: low assurance; allowlisted host commands only.
- `container-local`: medium assurance; Docker/Podman when available.
- `container-netoff`: medium-high assurance; Docker/Podman with `--network none`
  and resource-limit intent.
- `vm-local` and `ci-isolated`: high-assurance placeholders that report
  unavailable until real backends are configured.

`container-netoff` never silently falls back to host execution. If Docker or
Podman is missing, Sovryn writes unavailable execution evidence and stops. Worker
reports under `.sovryn/workers/` record sandbox posture, network policy,
filesystem mount intent, resource limits, worker policy, and supply-chain risk.
These reports are evidence, not a proof that the runtime is safe for hostile
code. Strong isolation still requires a hardened container or VM policy,
dedicated credentials, network controls, resource controls, and operator review.

Alpha.16 adds Node Alpha toolchain planning:

```bash
sovryn node alpha toolchain plan <factory-id> --json
sovryn node alpha toolchain doctor --json
sovryn node alpha toolchain install <toolchain-plan-id> --profile container-local --json
```

Toolchain autonomy is policy-first. Sovryn checks and records allowed research
tools, but it does not let Node Alpha perform uncontrolled host installation.
`sudo`, host package managers, shell-piped installers, global npm installs, and
host Python user installs are blocked in policy evidence. Missing tools are
recorded as missing/blocked and require an approved worker profile or manual
operator action. Toolchain logs are redacted and use relative paths.

Alpha.17 adds public-source research cache and adapter health artifacts:

```bash
sovryn research adapters doctor --json
sovryn research cache status --json
sovryn research cache prune --json
```

These artifacts are local by default. They may include public URLs, source
titles, adapter failure notes, and source-quality judgments, but they must not
include tokens, raw stdout/stderr, private config, or full raw source content.
Offline replay and cache hits improve reproducibility; they do not bypass
Factory, Open Invention, safety, secret, or publication gates.

Alpha.20 adds local corpus memory under `.sovryn/corpus/`. Corpus artifacts are
not published automatically and should be treated as local research memory. The
public registry file `PUBLIC_RELEASES.md` contains curated release metadata
only; it must not include raw logs, secrets, private config, full raw source
content, or local absolute workspace paths.

Beta.10 adds corpus autopublish into the existing
`n57d30top/sovryn-open-inventions` repository only. This is not permissionless
GitHub publishing and it does not create repositories. Human review is not
required for the corpus path, but automated gates are mandatory: quality,
evidence strength, reproducibility, publication safety, replay-critical
freshness, security audit, safety scan, reliability replay, publication
dry-run, public hygiene, and no-silent-fallback worker evidence where relevant.
Any raw command journal, stdout/stderr field, secret-like value, local absolute
path, private config, dangerous content, or fake legal patentability/FTO claim
blocks commit and push.

Beta.11 adds a safe external chemistry-style data-quality research run. The
custom `mol-record-auditor` prototype may provision `pint` in an isolated
prototype environment, but it must not use host `sudo`, curl-pipe-shell
installers, global installs, synthesis instructions, wet-lab protocols,
drug-design behavior, hazardous optimization, raw logs, secrets, or private
paths in public outputs.

Beta.12 adds a higher-assurance v2 path for that flow. Package provisioning is
recorded as a separate phase, and final validation prefers `container-netoff`
with network disabled. `container-netoff` must not silently fall back to host
execution; if the profile is unavailable or fails, the run records degraded
evidence and does not qualify as high-assurance autopublish input.

Beta.13 adds a safe synthetic energy-data anomaly run. It must not use private
smart-meter data, household-identifying data, surveillance workflows, personal
data publication, or energy-market trading advice. The external package
provisioning rules remain unchanged: no host `sudo`, no curl-pipe-shell, no
global install by default, redacted logs only, and final validation through the
requested worker profile with no silent fallback.

Beta.14 adds defensive software patch-risk auditing with synthetic toy patches
only. It must not operate against real systems, generate harmful code, publish
unsafe payloads, or score real pull requests without explicit safe input. The tool may
flag risky dependency and script patterns for defensive review, but public
outputs must remain curated summaries and must not include raw command logs,
secrets, local absolute paths, or unsafe operational instructions.

Beta.15 adds anti-template quality gates so public corpus publication can block
generic or shallow outputs even when hygiene scans pass.

Alpha.22 adds `.sovryn/quality/` evaluator artifacts. The quality evaluator
scans curated public releases for secret-like text, raw log references, local
absolute paths, and unsafe legal patentability language. These checks are an
additional audit layer; they do not replace publication gates, secret scanning,
worker isolation, or human review.

Alpha.23 adds `.sovryn/overnight/` operator artifacts. Overnight mode can
coordinate opportunity queues, Factory runs, Quality evaluation, improve cycles,
replay, curated packaging, corpus updates, and morning briefs. It is not a
publication mode. The operator records a `NO_REAL_PUBLICATION_DURING_OVERNIGHT`
gate, keeps GitHub credentials with Sovryn Controller, writes redacted JSONL
events, and does not copy raw stdout/stderr or command journals into reports.
High-safety-risk opportunities are blocked before execution.

Alpha.24 adds `.sovryn/corpus/public/` curated public corpus exports and an
optional `public-corpus/` static shell. Public corpus export checks require an
allowlisted file set, quality labels, release statuses, no raw command logs, no
secret-like values, and no local absolute paths. The public corpus is discovery
metadata only; it does not publish private memory, raw source content, raw
execution evidence, or legal patentability claims.

Beta.16 extends this model to the public corpus product layer. `sovryn corpus
site audit --target-repo <repo>` scans the generated static site, JSON API,
badges, aggregate summaries, and result pages for raw logs, secret-like values,
local absolute paths, private configuration, unsafe content, and fake legal
claims before operators commit and push the public corpus site.

Beta.17 uses the same restrictions during the overnight external trial and
`launch v1-rc-check`: corpus publication is restricted to the existing public
corpus repo, dangerous goals are blocked, worker no-silent-fallback evidence is
required, and the trial must not create standalone GitHub repositories.

Alpha.25 adds security, reliability, and abuse audit commands:

```bash
sovryn security audit --json
sovryn security audit-public-release <public-release-path> --json
sovryn security audit-worker --profile container-netoff --json
sovryn reliability audit --json
sovryn reliability replay-all --json
sovryn safety scan-goal "Improve autonomous research agents" --json
sovryn safety scan-release <public-release-path> --json
```

Security audit scans generated public release roots, public corpus exports,
release-candidate packages, worker doctor output, and generated command
evidence. It blocks command-injection-like payloads in command evidence,
curl-pipe-shell installers, host package-manager installs, `sudo`, raw stdout or
stderr files/fields, secret-like text, local absolute paths, fake sandbox
claims, and fake patentability or freedom-to-operate claims.

Reliability audit runs `reliability replay-all`, rebuilds corpus/public-corpus
views, and updates the release registry from current evidence. It fails when a
factory replay fails, release-candidate review errors, public corpus gates fail,
or registry reconstruction fails. Beta.8 reports both total replay pass rate
and replay-critical pass rate so volatile observations remain visible without
weakening launch-blocking replay gates.

Safety scans are conservative text checks. They are not semantic guarantees,
but they prevent obvious abusive goals and unsafe public-release text from
being treated as acceptable research evidence. They do not weaken existing
Factory, Worker, Open Invention, secret, replay, quality, or publication gates.

Alpha.26 beta packaging writes curated summaries under `.sovryn/beta/package/`.
The package excludes raw logs, private config, secrets, local absolute paths,
and full raw source content. It is a demo/review bundle only; human review and
existing publication gates are still required before any real GitHub
publication.

Beta operationalization adds `.sovryn/autonomy/`, `.sovryn/publication/`,
`.sovryn/workers/alpha/`, `.sovryn/benchmarks/`, `.sovryn/launch/`,
`.sovryn/e2e/`, and `public-corpus/api/` evidence roots. These workflows are
still local evidence systems. Autonomy campaigns and E2E validation record
`noRealPublication: true`; publication governance keeps real publish disabled
by default; worker jobs do not perform host installation by default; and
unavailable container profiles must not silently fall back to host execution.

Factory public release packages are allowlisted. They must not include raw
command journals, raw stdout/stderr logs, private config, tokens, local absolute
paths, full raw source content, or files outside the curated public evidence
set. Review gates fail if these checks fail.

Factory replay is part of the safety model. Replay recomputes score and gates
from existing evidence without source discovery or network calls, detects stale
hashes, and blocks public evidence packages that contain raw logs or absolute
local paths. Replay-critical artifacts must be stable and hash-bound according
to `docs/REPLAY_CONTRACT.md`. Replay does not replace human review.
