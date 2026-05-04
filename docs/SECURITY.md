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

Mission evidence can still contain sensitive project context after redaction.
`sovryn init` adds `.sovryn/missions/` and `.sovryn/memory/` to `.gitignore`.
Only remove those ignores when the project intentionally publishes evidence and
memory artifacts.

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

Factory public release packages are allowlisted. They must not include raw
command journals, raw stdout/stderr logs, private config, tokens, local absolute
paths, full raw source content, or files outside the curated public evidence
set. Review gates fail if these checks fail.

Factory replay is part of the safety model. Replay recomputes score and gates
from existing evidence without source discovery or network calls, detects stale
hashes, and blocks public evidence packages that contain raw logs or absolute
local paths. Replay does not replace human review.
