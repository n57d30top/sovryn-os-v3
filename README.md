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
sovryn node register alpha --host local --json
sovryn node run alpha <mission-id> --json
sovryn node run alpha <mission-id> --mode autonomous --max-steps 25 --json
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

GitHub credentials stay with Sovryn Controller. The autonomous agent prepares
artifacts, but `publish-github` is gated by dossier, license, verification,
source-stability, source-hash freshness, secret-scan, safety, prior-art,
large-file scan coverage, defensive-publication, and finality checks. Dry-run
publication can stage a release package before finalization; real publication is
finalization-gated. Release repos include curated public evidence under
`evidence/public/`; raw command logs and final controller-only GitHub evidence
remain local by default.

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
