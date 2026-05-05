# Reality-Grade Demo

```bash
sovryn init --json
sovryn sources ingest "safe data quality anomaly detection benchmark" --max-sources 20 --json
sovryn knowledge graph build --json
sovryn benchmark suite build --json
sovryn benchmark run --suite safe-reality --json
sovryn reproduce independent --top-from-knowledge --json
sovryn falsify adversarial --top-from-knowledge --json
sovryn reality-grade trial run --json
```

The demo writes local `.sovryn/` artifacts only unless
`--autopublish-corpus` is explicitly passed to the final trial.
