# Frontier Scientific Production

Sovryn OS `4.2.0-rc.1` adds a bounded frontier production layer for
provenance-aware data-quality methods.

The goal is not to claim a breakthrough. The goal is to run a harder scientific
production campaign: expand verified benchmark coverage, generate many method
candidates, reject weak candidates, test top prototypes against strong
baselines, run adversarial falsification, independently replicate surviving
candidates, and publish either a replication-supported candidate or a useful
negative result.

## Commands

```bash
sovryn frontier benchmark expand --json
sovryn frontier candidates generate --json
sovryn frontier baseline-dominance run --json
sovryn frontier replication run --json
sovryn frontier package build --json
sovryn frontier trial run --autopublish-corpus --json
sovryn frontier trial audit --json
sovryn frontier trial report --json
```

## Outputs

Frontier artifacts are written under `.sovryn/frontier/`:

- `benchmark-expansion/`
- `method-factory/`
- `baseline-dominance/`
- `replication/`
- `paper-packages/`
- `trials/`

Public corpus publication uses result type
`frontier_scientific_production_trial` and remains gated by public hygiene,
baseline honesty, no fake breakthrough claims, and evidence-bound scientific
claims.

## Scope

This is safe computational science only. It does not provide wet-lab guidance,
hazardous chemistry, medical advice, exploit guidance, patent filing, legal
novelty advice, freedom-to-operate advice, or guaranteed scientific truth.
