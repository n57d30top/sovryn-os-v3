# Daemon Usage Reality Check

## Current Answer

Before this pass, the Discovery Daemon used many mechanisms nominally: the
`MechanismRouter` selected tool IDs and stored them in `MechanismPlan` records,
but the cycle did not execute the selected modules or attach a
module-execution artifact downstream.

After the P1 fix, new daemon cycles execute selected mechanism tools through
existing services and write a `mechanism_plan_execution` artifact for each
plan. The cycle summary and proof/mechanism pressure now consume that artifact.

## Does The Daemon Really Use Computational Scientist?

Before fix: nominally selected for dataset/materials/astro/climate candidates.

After fix: yes, through `ScienceService.question()` for candidate types that
select `computational_scientist`.

Caveat: this is a bounded invocation contract, not the full standalone science
workflow.

## Does It Really Use Research Strategist?

Before fix: selected in every plan but not invoked by the cycle.

After fix: yes, through `StrategyService.rank({ top: 1 })`.

Outputs are referenced in the mechanism execution artifact and consumed by
cycle pressure.

## Does It Really Use Knowledge Engine?

Before fix: selected in every plan but not invoked by the cycle.

After fix: yes, through `KnowledgeService.graphBuild()`.

Caveat: this builds the existing knowledge artifact contract; the daemon still
does not make the full knowledge graph the sole candidate prioritization source.

## Does It Really Use Cross-Domain Router?

Before fix: selected in every plan but not invoked by the cycle.

After fix: yes, through `CrossDomainEvidenceRoutingService.plan()`.

## Does It Really Use Domain Packs?

Before fix: selected in every plan but not invoked by the cycle.

After fix: yes, through `CrossDomainEvidenceRoutingService.execute()`.

The domain-pack output is attached to the execution artifact and the cycle
pressure artifact.

## Does It Really Use Nobel-Readiness Gates?

Before fix: selected in every plan but not invoked by the cycle.

After fix: yes, through:

- `NobelReadinessService.rivalReview()`
- `NobelReadinessService.criteria()`

Caveat: this does not change the Fund Gate and does not convert internal
criteria into external scientific review.

## Does It Really Use Formal/Repo/Temporal/Dataset Tools?

After fix:

| Candidate class                 | Selected tool                | Invoked module                                                                 |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| formal                          | `formal_proof_route`         | `FormalDiscoveryService.proofCheck()`                                          |
| repo                            | `repo_deep_reproduction`     | `RuntimeReproductionAlignmentService.runInstrument()`                          |
| temporal                        | `temporal_v2`                | `TemporalEvaluationFragilityService.runInstrument()`                           |
| dataset/materials/astro/climate | `dataset_public_data_triage` | `CrossDomainEvidenceRoutingService.execute()` with dataset/public-data framing |
| benchmark                       | `benchmark_protocol_audit`   | `CrossDomainEvidenceRoutingService.execute()` with benchmark framing           |
| claim/principle                 | `claim_safety_review`        | `ExternalReviewScientistService.status()`                                      |

## Nominal Selection Versus Actual Invocation

Before fix:

- selected: all 14 router tool IDs as candidate type required
- actual module invocation: no module-level execution artifact in cycle
- downstream consumption: only selected tool names and conceptual pressure refs

After fix:

- selected: unchanged router behavior
- actual module invocation: `MechanismPlanExecutor` invokes each selected tool
- downstream consumption: cycle `mechanismRoutingSummary` and
  `proofOrMechanismPressure` require/record execution status for new cycles

## Selected In `MechanismPlan` But Not Executed

After the fix, no selected tool in a new cycle is allowed to remain only
selected if the cycle uses the new execution contract. A failed invocation is
recorded with `invoked: false`, no artifact refs, and an error message, which
makes downstream consumption fail closed.

Legacy local cycles without `mechanismExecutions` remain readable so existing
daemon audits are not broken by a schema migration.

## Outputs Consumed Downstream

`MechanismPlanExecutor` writes:

- `.sovryn/discovery-daemon/mechanism-executions/<cycle-candidate>.json`

`SilentSearchLoopRunner.runCycle()` consumes that output into:

- `cycle.mechanismExecutions`
- `cycle.mechanismRoutingSummary.mechanismExecutionCount`
- `cycle.mechanismRoutingSummary.everyMechanismPlanExecuted`
- `cycle.mechanismRoutingSummary.allSelectedToolsInvoked`
- `cycle.mechanismRoutingSummary.downstreamConsumable`
- `cycle.proofOrMechanismPressure.mechanismExecutionRef`
- `cycle.proofOrMechanismPressure.outputArtifactRefs`

`FundCandidate` construction still uses the existing boolean pressure fields.
Fund Gate logic was not changed.

## Where The Daemon Is Still Too Narrow

- It runs bounded contract invocations, not every CLI workflow behind each
  mechanism.
- External production/reproduction and frontier/field/reality grading remain
  outside the router.
- Package scout remains weak as live intake.
- External review readiness is still an evidence problem, not solved by module
  invocation.
- Fund/OS closure reconciliation remains a separate unsafe state task.
