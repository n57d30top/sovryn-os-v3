# Migration From v2

Sovryn OS v3 is a rebuild, not a drop-in upgrade.

Major changes:

- Worktrees are enabled by default.
- OQP and research workflows are not core features.
- File storage is the default required storage.
- Postgres is an optional adapter, not the default storage driver.
- Stable JSON envelopes are the command contract.
- Finalize re-runs verify, requires a current review by default, and is blocked
  by policy, approval, and secret-scan gates.
- Approvals are bound to the current diff hash and verify-result hash.
- Password SSH is intentionally unsupported; the SSH runner uses agent or
  identity-file based authentication only.

Recommended migration:

1. Keep v2 repositories intact.
2. Create a fresh v3 repository.
3. Move only generic mission, verify, review, and policy concepts into core.
4. Move OQP workflows into a separate plugin package.
5. Enable `sovryn-plugin-gitnexus` from `.sovryn/plugins.json` for GitNexus
   impact/status workflows.
