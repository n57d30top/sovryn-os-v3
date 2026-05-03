# Plugin API

Plugins are optional extensions. Core must not import domain-specific plugins.

A plugin can provide:

- Commands
- Verify providers
- Artifact parsers
- Review enrichers

Minimal interface:

```ts
export type SovrynPlugin = {
  name: string;
  version: string;
  commands?: PluginCommand[];
  verifyProviders?: VerifyProvider[];
  artifactParsers?: ArtifactParser[];
  reviewEnrichers?: ReviewEnricher[];
};
```

Plugins receive a constrained context with the repo root. They must return
stable JSON-compatible data and must not bypass policy or finalize gates.

The included sample plugin is a loader fixture. Domain plugins are not imported
by core unless configured.

Enable plugins with `.sovryn/plugins.json`:

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

`module` may be an installed package name or a local file path. If `export` is
omitted, the loader tries `default`, `plugin`, then `createPlugin`.

`packages/sovryn-plugin-gitnexus` is a real optional plugin package that shells
out to a local `gitnexus` command or `SOVRYN_GITNEXUS_COMMAND`.
