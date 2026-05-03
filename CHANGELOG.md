# Changelog

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
