# Source Ingestion Demo

```bash
sovryn sources search "public scientific dataset metadata schema drift" --json
sovryn sources ingest "public scientific dataset metadata schema drift" --max-sources 20 --json
sovryn sources cards --json
sovryn sources report --json
```

Source cards are structured summaries with source links, methods, claims,
baselines, datasets, limitations, access notes, and safety scope. Public output
does not include raw fulltext.
