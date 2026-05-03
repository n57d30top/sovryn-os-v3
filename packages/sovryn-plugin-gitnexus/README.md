# sovryn-plugin-gitnexus

Optional GitNexus integration for Sovryn OS v3.

The plugin shells out to a local `gitnexus` command or the command named by
`SOVRYN_GITNEXUS_COMMAND`. It does not run network operations by itself and does
not bypass Sovryn policy or finalize gates.

Enable it from `.sovryn/plugins.json`:

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

Commands exposed through Sovryn:

```bash
sovryn plugin run gitnexus status --json
sovryn plugin run gitnexus analyze --json
sovryn plugin run gitnexus impact MissionService --json
sovryn plugin run gitnexus query MissionRunner --json
sovryn plugin run gitnexus changes --json
```

If GitNexus is unavailable, commands return structured `available: false` data
instead of crashing.
