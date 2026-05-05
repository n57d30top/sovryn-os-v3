# Reality-Grade Scientific Autonomy

Sovryn OS `4.0.0-rc.1` hardens the Scientific Knowledge Engine against
fixture-only behavior. The goal is not to claim scientific truth. The goal is
to bind more work to external sources, benchmark tasks, independent
reproduction, adversarial falsification, and curated public limitations.

## Scope

Reality-grade autonomy adds:

- structured source cards for papers, repositories, datasets, benchmark docs,
  and package docs
- dataset cards with license/access, safety, sensitivity, and reproducibility
  notes
- a safe benchmark harness with baselines, candidate methods, ablations,
  sensitivity tests, replication seeds, and recorded failures
- independent reproduction variants using fresh workspace evidence and
  divergence reports
- adversarial falsification cases for safe computational domains
- multi-domain and final reality-grade autonomy trials

It does not copy raw fulltext into public packages, does not use private data,
does not make medical, legal, hazardous chemistry, biological, exploit, or
safety-critical conclusions, and does not infer breakthrough labels from score
alone.

## Commands

```bash
sovryn sources ingest "safe data quality anomaly detection benchmark" --max-sources 20 --json
sovryn benchmark suite build --json
sovryn benchmark run --suite safe-reality --json
sovryn reproduce independent --top-from-knowledge --json
sovryn falsify adversarial --top-from-knowledge --json
sovryn reality trial run --domains 5 --json
sovryn reality-grade trial run --autopublish-corpus --json
```

## Public Result

Eligible final trials publish `reality_grade_autonomous_science_trial` packages
with source ingestion, benchmark, reproduction, falsification, knowledge update,
next research direction, limitations, and summary files.
