# Frontier Production Demo

Run the bounded production slices:

```bash
sovryn frontier benchmark expand --json
sovryn frontier candidates generate --json
sovryn frontier baseline-dominance run --json
sovryn frontier replication run --json
sovryn frontier package build --json
```

The demo should produce benchmark, candidate, falsification, replication, and
paper-grade package artifacts under `.sovryn/frontier/`.
