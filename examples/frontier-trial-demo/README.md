# Frontier Trial Demo

Run the full bounded frontier production trial:

```bash
sovryn frontier trial run --autopublish-corpus --json
sovryn frontier trial audit --json
```

The public package is published only when candidate generation, benchmark
coverage, baseline-dominance, independent replication, paper-package, safety,
and hygiene gates pass.
