# Not Anti-Cheat Wired Mechanisms

Self-assembly counted 16 mechanisms as anti-cheat wired. Four mechanisms were
present in smoke flows but not counted:

- `daemon_hard_seeds`
- `daemon_fund_candidate_draft`
- `scientific_public_data_triage_domain_pack`
- `corpus_index_graph_export`

This reconciliation separates true unwiring from missing proof.

## daemon_hard_seeds

- Selected: yes in daemon cycle generation and hard-seed-only mode.
- Invoked: yes. The current Fund cycle contains `hardSeedGeneration`,
  `hardSeeds`, and `hardSeedValidations`.
- Artifact produced: yes.
  `.sovryn/discovery-daemon/hard-seed-generation.json`,
  `.sovryn/discovery-daemon/hard-seeds.json`, and cycle-embedded hard seeds.
- Downstream consumed: yes in daemon candidate ideas, promoted candidates,
  mechanism routing, Fund package bindings, and public claim/evidence bindings.
- Tested: yes in `tests/discovery-daemon.test.ts`.
- Anti-cheat gap: self-assembly smoke flow B used a hard-seed-shaped candidate
  as input and proved router/domain-pack execution, but it did not add a
  separate anti-cheat proof that `HardSeedGenerator` output itself was selected
  and consumed by the same smoke execution.
- Classification: `only missing anti-cheat proof`

## daemon_fund_candidate_draft

- Selected: yes through candidate-present preflight and draft audit commands.
- Invoked: yes for existing draft/preflight artifacts and tests.
- Artifact produced: yes, including
  `.sovryn/discovery-daemon/candidate-present-preflight.json` and draft files.
- Downstream consumed: partially. Drafts are designed for Fund Gate preflight,
  and tests cover no-promotion-without-gate behavior.
- Tested: yes for validators and fake-draft rejection.
- Anti-cheat gap: the current SciPy Fund candidate does not have a matching
  draft artifact, and latest `candidate-present-preflight.json` points to a
  different later cycle.
- Classification: `missing contract`

## scientific_public_data_triage_domain_pack

- Selected: nominally through dataset/public-data route mapping.
- Invoked: partially. Self-assembly flow E invokes the dataset audit route and
  lists this mechanism, but the proof maps to `dataset_audit_domain_pack`, not a
  distinct `scientific_public_data_triage_domain_pack` artifact contract.
- Artifact produced: partially through science/lab/OS public-data artifacts and
  dataset route executions.
- Downstream consumed: partially through dataset audit and insight-candidate
  disposition.
- Tested: yes for science/lab/OS public-data pieces, but not for an explicit
  anti-cheat proof under this mechanism ID.
- Anti-cheat gap: the mechanism map treats scientific public-data triage as a
  named domain pack, while the executable router path currently proves the
  dataset audit mechanism ID.
- Classification: `missing contract`

## corpus_index_graph_export

- Selected: no explicit upstream planner/router selection in self-assembly.
- Invoked: yes through corpus index/export commands and as daemon corpus context
  loading from the sibling `sovryn-open-inventions` index.
- Artifact produced: yes, including `.sovryn/corpus/public/index.json`,
  `.sovryn/corpus/public/corpus-graph.json`, and sibling public corpus indexes.
- Downstream consumed: partially. The daemon cycle consumed a sibling corpus
  snapshot with 613 sampled result refs, and Strategy consumes corpus signals.
- Tested: yes for corpus services, but not as an anti-cheat selected mechanism.
- Anti-cheat gap: there is no proof object tying corpus index/graph export to
  upstream selection, invocation, artifact production, downstream consumption,
  and contract test under one mechanism ID.
- Classification: `wired_with_caveats`

## Bottom Line

- Truly unwired: none proven.
- Missing current-state contract: `daemon_fund_candidate_draft`.
- Missing alias/identity contract: `scientific_public_data_triage_domain_pack`.
- Missing anti-cheat proof shape: `daemon_hard_seeds`,
  `corpus_index_graph_export`.
