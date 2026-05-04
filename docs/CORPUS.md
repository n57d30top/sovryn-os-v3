# Corpus

The corpus layer indexes generated Factory runs, Open Inventions, source cards,
claim features, quality scores, duplicate-risk relationships, and release
metadata.

```bash
sovryn corpus index --json
sovryn corpus search "verifiable evidence" --json
sovryn corpus export-public --json
sovryn corpus site build --json
sovryn corpus explain <id> --json
```

Public corpus export is curated. It must not include raw command logs, secrets,
private config, local absolute paths, full raw source content, or legal
patentability claims.

The corpus improves future opportunity scans and helps reduce duplicate
research. It is evidence memory, not a legal patent registry.
