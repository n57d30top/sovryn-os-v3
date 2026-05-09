# Safe Fix Recommendations

These fixes are forward-looking and do not change Fund Gate logic, do not alter
current Fund status, do not promote candidates, and do not upgrade OS closure.

## 1. Add a Read-Only Fund Reconciliation Command

- Proposed command:
  `sovryn fund reconcile --read-only --json`
- Purpose: read `state.json`, `fund-gate-results.json`, `FUND_FOUND.md`,
  `fund-candidate.json`, identity ledger refs, package bindings, OS closure
  semantics, and public corpus metadata without writing artifacts.
- Expected artifact/contract: JSON returned to stdout; optional artifact only
  when an explicit `--write-report` flag is supplied.
- Risk: low if default is no-write.
- Affects Fund Gate: no.

## 2. Require Draft Ref Or Legacy Bypass For Future Fund Packages

- Module affected: discovery daemon package generation.
- Purpose: any future Fund package must bind either a FundCandidateDraft ref or
  an explicit immutable `legacyDraftBypassReason`.
- Expected artifact/contract:
  `CLAIM_EVIDENCE_BINDINGS.json#candidateDraftRefs` or
  `CLAIM_EVIDENCE_BINDINGS.json#legacyDraftBypassReason`.
- Risk: medium because it touches package contracts. It must be forward-only and
  must not rewrite the SciPy Fund.
- Affects Fund Gate: no.

## 3. Propagate FundClass Into Nobel-Readiness Service Audit

- Module affected: `src/core/nobel/nobel-readiness-service.ts`.
- Purpose: when a daemon FundClass assessment exists, Nobel-readiness should
  consume it and report non-discovery Fund counts while keeping scoring
  separation.
- Expected artifact/contract:
  `.sovryn/nobel-readiness/readiness-score.json` includes
  `nonDiscoveryFundCandidateCount > 0` for reproduction/tool/pipeline Funds and
  `einsteinNobelDiscoveryScoreEligible: false`.
- Risk: low if it only reports/excludes non-discovery Funds.
- Affects Fund Gate: no.

## 4. Add Read-Only OS Closure Mode

- Module affected: `src/core/os/os-v16-capability-service.ts` and CLI command
  surface.
- Purpose: allow protected audits to compute closure state without rewriting
  `.sovryn/os-v1_6/*`.
- Expected artifact/contract: `os closure-audit --read-only --json` returns the
  closure report without file writes.
- Risk: low; must preserve existing writing behavior for the current command.
- Affects Fund Gate: no.

## 5. Add Public Corpus FundClass Metadata Propagation

- Module affected: corpus publication/autopublish indexing.
- Purpose: propagate `fundClassification` and
  `countsForEinsteinNobelDiscoveryScore` from result packages into aggregate
  `INDEX.json` and public API entries.
- Expected artifact/contract: public aggregate entries expose the same class and
  scoring flag as the package summary.
- Risk: low to medium because public schema consumers may observe new fields.
- Affects Fund Gate: no.

## 6. Make Scientific Public Data Triage Mechanism Identity Explicit

- Module affected: mechanism router/self-assembly proof mapping.
- Purpose: either invoke a distinct public-data triage mechanism or record the
  explicit alias to dataset audit in proof artifacts.
- Expected artifact/contract: anti-cheat proof for
  `scientific_public_data_triage_domain_pack` has selected, invoked, produced,
  consumed, and tested fields.
- Risk: low if it is proof/alias metadata only.
- Affects Fund Gate: no.

## 7. Add Corpus Export Source Proof For Daemon Context

- Module affected: corpus service, daemon corpus snapshot loader, self-assembly
  proof generation.
- Purpose: prove the corpus index/graph export mechanism is the source of daemon
  corpus context or explicitly mark sibling `INDEX.json` as the consumed corpus
  source.
- Expected artifact/contract:
  `corpusExportRef -> daemon corpus snapshot -> strategy priority`.
- Risk: low if it only binds existing refs.
- Affects Fund Gate: no.
