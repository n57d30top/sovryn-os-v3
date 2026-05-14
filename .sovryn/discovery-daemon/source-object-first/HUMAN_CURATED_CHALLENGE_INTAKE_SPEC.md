# Human-Curated Challenge Intake Spec

Status: available as secondary formal path, not selected as the primary active discovery strategy.

A human-curated formal challenge may enter the existing formal path only if it supplies all fields below before execution.

| Field | Required content |
| --- | --- |
| exactClaim | A narrow, bounded, falsifiable statement. |
| sourceUrl | Public URL, paper section, issue, benchmark note, or database record. |
| concreteObject | CNF, SMT2, graph6, edge list, adjacency matrix, automaton transition table, incidence structure, OEIS terms/generator, or deterministic formal generator spec. |
| sourceReceiptHash | Stable hash or receipt for the object/source text. |
| falsifier | A concrete condition that would refute or downgrade the claim. |
| expectedWitnessOrRefutation | The certificate/counterexample/proof object expected if the claim is true or false. |
| rivalMechanism | The strongest plausible known theorem, source-family, size/density/symmetry, heuristic, or standard-certificate explanation. |
| knownTrivialityRisk | Low/medium/high plus rationale and known-prior references. |
| whyItMatters | External value: why a replayable proof/refutation/witness would matter beyond Sovryn internals. |
| replayMethod | Exact command, deterministic reconstruction, or checker route. |
| noOverclaimScope | What is not claimed; no Nobel/Einstein/breakthrough/external-validation wording. |

Reject if any field is missing, the object is not concrete, the witness would be standard/trivial, or known-prior absorption is fatal.
