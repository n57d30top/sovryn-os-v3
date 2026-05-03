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
