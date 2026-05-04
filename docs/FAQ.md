# FAQ

## Is Sovryn a patent filing tool?

No. Sovryn produces Open Inventions, Defensive Publications, prototypes, tests,
and Open Source Research Artifacts. It does not file legal patents and does not
provide legal novelty, patentability, or freedom-to-operate opinions.

## Does Sovryn publish automatically?

No. Agents may generate artifacts, but publication remains gated by Sovryn
Controller, policy checks, evidence hashes, safety checks, secret scans, and
human review.

## Is Node Alpha a security sandbox?

No. Node Alpha has constrained worker profiles, including `sandbox-local` and
container-oriented profiles, but strong isolation requires hardened containers,
VMs, dedicated users, network controls, and credential isolation.

## Can tests run without internet?

Yes. Factory, source search, source reading, release candidates, quality,
corpus, audit, and beta demo flows have deterministic fixture-backed paths.

## What does beta check prove?

It verifies local readiness evidence: docs, release candidates, quality,
security/reliability audits, public corpus export, public leak checks,
non-legal language, and regression test count. GitHub Actions status should
still be confirmed externally before a public release.
