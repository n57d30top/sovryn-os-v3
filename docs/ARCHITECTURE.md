# Architecture

Sovryn OS v3 is a local evidence kernel, not an agent framework.

Core responsibilities:

- Mission kernel: create missions, run attempts, track state.
- Workspace manager: create and remove Git worktrees.
- Runner adapters: execute fake, shell, Codex, or passwordless SSH runners behind
  one interface.
- Verifier: discover and run commands by exit code.
- Policy engine: classify risk and block unsafe finalization.
- Review engine: summarize diff, verify, risk, and evidence.
- Storage: persist mission state and artifacts to `.sovryn/` by default, or
  mirror mission state and artifacts through the optional Postgres adapter.
- Plugin API: expose extension points and load configured plugins without
  importing domain-specific code by default.

The core never imports OQP, deploy, lab, or research logic. Those workflows must
be plugins. GitNexus is provided as an optional plugin package.

Finalize is the only command that mutates the base working tree. It re-runs
verify immediately, checks that the stored review matches the current diff and
verify-result hashes, evaluates policy and secret scan, then commits the mission
worktree branch and fast-forwards the configured base branch.
