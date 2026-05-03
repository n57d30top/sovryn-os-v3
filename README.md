# Sovryn OS v3

Sovryn OS is a local-first evidence kernel for AI-assisted coding and research.
It runs agents in isolated Git worktrees, verifies their work through exit codes,
records artifacts, enforces policy, and requires review before finalization.

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
node dist/src/cli/index.js --help
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
  match the current diff and verify hashes.

## What Sovryn Does Not Do

- It does not decide truth with an LLM.
- It does not ship OQP or research workflows in the core.
- It does not implement password SSH.
- It does not store unredacted secrets in prompts, logs, mission files, or
  artifacts.

## Default Storage

File storage is the default storage driver. Postgres is available as an optional
adapter through `storage.driver = "postgres"` and `SOVRYN_DATABASE_URL` or the
configured `storage.postgres.urlEnv`.

## Plugins

The plugin API is intentionally small. Plugins can register commands, verify
providers, artifact parsers, and review enrichers. Domain logic such as OQP,
deploy, and lab workflows belongs in plugins, not in the core.

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
