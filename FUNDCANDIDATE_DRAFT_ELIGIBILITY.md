# FundCandidateDraft Eligibility

Allowed: yes

## Eligibility Gates

- exact_stable_claim: passed - FundCandidateDraft requires the exact stable DiscoveryCandidate claim.
- two_plus_independent_public_raw_survivors: passed - FundCandidateDraft requires at least two independent public-raw replay survivors.
- nonfatal_pressure: passed - Baseline, rival, and negative-control pressure must remain nonfatal.
- reproducible_public_replay: passed - Replay must use public raw OpenML receipts, not product-runtime-only evidence.
- no_source_family_only_evidence: passed - Every supporting task must bind concrete task/data receipts rather than source-family-only URLs.
- no_fake_novelty: passed - The package must avoid fake novelty and external-validation overclaim.
- public_safe_package_readiness: passed - The package must bind public-safe evidence refs and explicit limitations.

## Draft Validation

Accepted: yes

- draft_schema: passed - Draft must use the FundCandidateDraft schema with stable ID, exact claim, and valid domain.
- candidate_identity_integrity: passed - Draft candidate identity must not drift silently.
- not_synthetic: passed - Synthetic drafts cannot be promoted.
- not_partial_candidate: passed - Partial candidates cannot be promoted as Fund drafts.
- public_source_refs: passed - Draft must bind to concrete public source refs.
- evidence_refs: passed - Draft must bind at least five public-safe evidence refs.
- identity_ledger_refs: passed - Draft must bind to candidate identity ledger refs.
- hard_seed_refs: passed - Draft must bind to hard-seed refs.
- package_refs: passed - Draft must bind all required public package files.
- inspectability_path: passed - Draft must bind to a relative public-safe inspectability path.
- prediction_holdout_counterexample_replay_refs: passed - Draft must bind predictions, holdouts, counterexamples, replay, and kill-week evidence.
- limitations_present: passed - Draft must carry explicit limitations before inspectability promotion.
