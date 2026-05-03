# Changelog

## 3.0.0-alpha.1

- Hardened finalization: verify re-runs immediately before merge.
- Added diff and verify-result hashes for missions, reviews, and approvals.
- Required current review before finalization by default.
- Invalidated approvals when the diff or verify result changes.
- Loaded GitNexus through plugin configuration instead of the core built-in loader.
- Moved `pg` to optional dependencies and lazy-loaded the Postgres client.
- Expanded CI smoke coverage for a full mission/review/finalize flow.
