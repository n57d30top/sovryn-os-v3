# Changelog

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
