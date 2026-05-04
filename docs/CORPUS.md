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
sovryn corpus publish-status --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus publish-audit --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
```

Public corpus export is curated. It must not include raw command logs, secrets,
private config, local absolute paths, full raw source content, or legal
patentability claims.

The corpus improves future opportunity scans and helps reduce duplicate
research. It is evidence memory, not a legal patent registry.

## Corpus Autopublish

Beta.10 adds a narrow autopublish path for the existing public corpus repo:

```text
https://github.com/n57d30top/sovryn-open-inventions
```

`corpus autopublish` does not create repositories and does not require human
review for this corpus path. It still blocks unless automated gates pass:
quality `good` or `excellent`, `dry_run_ready` or `review_ready` status,
evidence strength >= 80, reproducibility >= 90, publication safety >= 85,
replay-critical pass rate 100, security/safety/reliability/public-hygiene pass,
and publication dry-run evidence present.

The target repo receives only curated result folders, summaries, verification
records, publication intent, and aggregate ledgers. Raw logs, stdout/stderr,
secrets, local absolute paths, private config, dangerous content, fake legal
claims, and full raw source dumps are blocked.

Every autopublished result states that it is an autonomous open-research
artifact, not a patent filing, not a patentability opinion, not a legal novelty
opinion, and not a freedom-to-operate opinion.

## Beta.11 External Research Result

Beta.11 adds a safe external research proof that can feed the corpus:

```bash
sovryn external-research run chemistry-record-auditor --json
sovryn corpus autopublish --target-repo /Users/sovryn/Desktop/sovryn-open-inventions --dry-run --json
```

The run builds `mol-record-auditor`, provisions `pint` under policy, validates
the prototype through Node Alpha, and publishes only curated evidence if the
same corpus autopublish gates pass. It is chemistry-style data-quality auditing
only, not synthesis, wet-lab guidance, drug design, hazardous optimization, or a
legal opinion.

## Beta.12 High-Assurance v2 Result

Beta.12 adds a versioned high-assurance chemistry auditor path:

```bash
sovryn external-research run chemistry-record-auditor --profile container-netoff --json
```

The generated slug is `chemistry-record-auditor-tool-v2`. The public corpus
entry is eligible only when package provisioning evidence exists, final
validation uses `container-netoff` with network disabled, no silent fallback is
recorded, public hygiene passes, replay-critical evidence remains fresh, and the
same automated corpus-autopublish gates pass.

## Beta.13 External Energy Result

Beta.13 adds a second external-domain run:

```bash
sovryn external-research run energy-record-auditor --profile container-netoff --json
```

The generated slug is `energy-usage-anomaly-auditor`. It uses a synthetic,
anonymized toy energy dataset and policy-provisioned `pandas` evidence to audit
duplicate timestamps, missing intervals, high-usage spikes, weather-normalized
anomalies, and weak provenance. The public result must not include private
smart-meter data, household-identifying data, surveillance workflows, or
energy-market trading advice.
