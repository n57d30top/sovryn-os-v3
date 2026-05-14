# Formal Discovery Loop Diagnosis

Scope: the last ten completed formal/source-object loops after the initial claim-first pilot baseline. The initial claim-first pilot also remains relevant context: 10 exact claim-first pilots, 0 InsightCandidates, 0 DiscoveryCandidates.

Verdict: yes, the autonomous formal Source-Object path is looping for positive discovery yield. It continues to improve rejection quality, but it has not improved positive candidate yield: 0 InsightCandidates or DiscoveryCandidates across the last ten loops.

| Run | Command/path | Considered | Accepted/rejected | Checks run | InsightCandidates born | DiscoveryCandidates created | Dominant death causes | Material positive-yield improvement |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| External formal anchor quality selection | sovryn discover-daemon source-object-engine --json / EXTERNAL_FORMAL_ANCHOR_SELECTION | 112 | 3 top candidates / 109 rejected before execution | 0 pilots executed after quality gate | 0 | 0 | low_anchor_quality_or_placeholder_like: 109 | no |
| Formal mechanism and cross-source gauntlet | FORMAL_MECHANISM_CROSS_SOURCE_GAUNTLET | 5 | 2 cross-source supported / 5 archived | 30 | 0 | 0 | mechanism_or_proof_support_not_closed: 5 | no |
| Proof-obligation-first formal discovery | FORMAL_PROOF_OBLIGATION_FIRST_DISCOVERY | 5 | 5 proof-ready / 0 rejected | 30 | 0 | 0 | proof_obligation_not_supported: 5 | no |
| Researcher-Theory-Scientist proof-quality gauntlet | RESEARCH_TEAM_STRONG_PROOF_QUALITY_GAUNTLET | 5 | 2 strong proof-ready / 3 rejected | 16 | 0 | 0 | strong_proof_obligation_not_supported: 2 | no |
| Certificate/witness-first formal discovery | CERTIFICATE_WITNESS_FIRST_FORMAL_DISCOVERY | 20 | 5 top triples / 2 rejected no-witness | 30 | 0 | 0 | rival_not_scoped_by_witness: 2, no_valid_witness_or_counterexample: 3 | no |
| Rival-scoped witness discovery | RIVAL_SCOPED_WITNESS_DISCOVERY | 10 | 5 top triples / 3 old artifacts rejected | 30 | 0 | 0 | rival_not_scoped_by_witness: 2, no_valid_witness_or_counterexample: 2, known_triviality_not_nonfatal: 1 | no |
| Nontrivial rival-scoped witness search | NONTRIVIAL_RIVAL_SCOPED_WITNESS_SEARCH | 10 | 7 pre-gate passed / 3 rejected | 30 | 0 | 0 | known_triviality_not_nonfatal: 1, rival_not_scoped_by_witness: 3, no_valid_witness_or_counterexample: 1 | no |
| Nonstandard certificate/refutation selection | NONSTANDARD_CERTIFICATE_REFUTATION_SELECTION | 20 | 5 top candidates / 10 rejected standard/trivial | 30 | 0 | 0 | standard_witness_absorbed: 3, no_valid_witness_or_counterexample: 2 | no |
| Curated external formal challenge selection | CURATED_EXTERNAL_FORMAL_CHALLENGE_SELECTION | 30 | 10 curated / 20 rejected | 30 | 0 | 0 | standard_witness_absorbed: 2, no_valid_witness_or_counterexample: 3 | no |
| Sharp-falsifier external claim mining | EXTERNAL_FORMAL_CLAIM_MINING with sharp-falsifier gate | 16 | 2 sharp-falsifier accepted / 14 rejected | 12 | 0 | 0 | no_valid_witness_or_counterexample: 2 | no |

## Interpretation

The path is not failing because of missing plumbing anymore. It now has source-object, claim-first, proof-obligation, witness, rival-scoping, nonstandard-certificate, external-claim, and sharp-falsifier gates. The repeated result is different negative evidence with the same positive-yield outcome: zero InsightCandidate births after the stricter gates.

Material improvement occurred in audit quality, death-cause integrity, and prevention of fake positives. It did not occur in candidate yield.
