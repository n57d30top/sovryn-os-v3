# GitHub Publication

GitHub publishing is performed by Sovryn Controller after publication gates
pass. The autonomous agent never receives raw GitHub credentials.

Config:

```json
{
  "github": {
    "enabled": true,
    "defaultOrg": "<org>",
    "tokenEnv": "SOVRYN_GITHUB_TOKEN",
    "defaultVisibility": "public"
  }
}
```

Dry run:

```bash
sovryn publish-github <mission-id> --dry-run
```

Dry-run publication prepares the release package and public evidence without
requiring invention finalization. Real GitHub publication remains finalization
gated.

Real publication:

```bash
SOVRYN_GITHUB_TOKEN=... sovryn publish-github <mission-id> --org <org> --repo <repo>
```

The publisher stages a clean release repository under
`.sovryn/inventions/<slug>/release/repo`, initializes Git, commits the dossier
and prototype, creates a release tag, and pushes through GitHub CLI using the
configured token environment variable.

Release packages include `evidence/public/publication-intent.json` before any
push is attempted. The final `.sovryn/inventions/<slug>/evidence/github-publication.json`
is local controller evidence written after the dry-run or real publish attempt;
it is not copied into the release package as stale public evidence.

`sovryn doctor --json` reports GitHub publication prerequisites:

- whether GitHub publishing is enabled
- whether `gh` is installed
- which token environment variable is configured
- whether that environment variable is present, without exposing the value
- whether dry-run publication is available
- whether real publication can run with the current local prerequisites
- default org and visibility

`github.canDryRun` can be true while `github.canPublish` is false. Real
publication requires both `gh` and the configured token environment variable.

Sovryn publishes Open Inventions and Defensive Publications. It does not file
legal patents.
