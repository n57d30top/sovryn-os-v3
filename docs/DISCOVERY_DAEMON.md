# Autonomous Discovery Daemon

The autonomous discovery daemon is Sovryn's silent search loop for safe,
high-impact computational and formal discovery candidates. It is designed to
continue searching until a strict Fund Gate passes, without reporting partial
signals as success.

## Commands

```bash
node dist/cli.js discover-daemon init --json
node dist/cli.js discover-daemon run --mode silent --until fund --json
node dist/cli.js discover-daemon resume --json
node dist/cli.js discover-daemon cycle --json
node dist/cli.js discover-daemon status --json
node dist/cli.js discover-daemon candidate-status --json
node dist/cli.js discover-daemon graveyard --json
node dist/cli.js discover-daemon fund-gate --json
node dist/cli.js discover-daemon notify-if-fund --json
node dist/cli.js discover-daemon audit --json
```

When installed globally or linked, use `sovryn` instead of `node dist/cli.js`.

## Silent-Until-Fund Rule

The daemon does not notify for:

- `no_signal`
- `weak_signal`
- `partial_signal`
- `promising_but_unvalidated`
- `promising_with_strong_caveats`
- candidates killed by baselines, counterexamples, replay, identity drift,
  known-pattern matches, rival theories, or missing inspectability
- routine graveyard, checkpoint, route, replay, or corpus maintenance

The only user-notifiable discovery status is `FUND_FOUND`, and it is allowed
only after every Fund Gate requirement passes.

## Fund Gate

A candidate can pass the Fund Gate only if it has:

- stable candidate identity and stable claim text,
- safe high-impact domain scope,
- nontriviality and known-pattern distance,
- at least three rival theories with direct pressure,
- strong baselines that do not dominate the candidate,
- counterexample pressure that does not collapse the claim,
- frozen predictions executed after freeze,
- fresh holdout support,
- replayed decisive evidence, including at least one fresh-workspace-style
  replay when applicable,
- proof, refutation, or mechanism pressure appropriate to the domain,
- completed adversarial kill week with no fatal unresolved attack,
- external-review package artifacts:
  `PAPER.md`, `METHOD.md`, `CLAIM_EVIDENCE_BINDINGS.json`, `REPRODUCE.md`,
  and `LIMITATIONS.md`.

If any major gate fails, the daemon must persist the candidate internally and
continue searching. It must not create or keep `FUND_FOUND.md` or a live
fund-candidate artifact for a failed candidate.

## State Artifacts

Daemon state is local and internal by default:

- `.sovryn/discovery-daemon/state.json`
- `.sovryn/discovery-daemon/candidate-identity-ledger.json`
- `.sovryn/discovery-daemon/graveyard.json`
- `.sovryn/discovery-daemon/search-cycles/`
- `.sovryn/discovery-daemon/checkpoints/`
- `.sovryn/discovery-daemon/fund-gate-results.json`
- `.sovryn/discovery-daemon/DAEMON_REPORT.md`
- `.sovryn/discovery-daemon/LIMITATIONS.md`

`FUND_FOUND.md` is valid only if the Fund Gate has passed.

## Current Claim Boundary

No Fund is currently claimed by default. `continue_searching` means the daemon
has persisted its search state and should resume later; it does not mean a
candidate has reached external review readiness.

The daemon does not claim a Nobel-level discovery, breakthrough, AGI,
Einstein-level intelligence, human-level science, external validation, external
adoption, medical/legal/wet-lab capability, or universal truth.

## Audit Path

Use the audit command after daemon runs:

```bash
node dist/cli.js discover-daemon audit --json
```

The audit checks silent-mode behavior, candidate identity, checkpoint/graveyard
state, Fund Gate strictness, stale fund-candidate files, stale `FUND_FOUND.md`,
and the rule that partial or promising-but-unvalidated states must not notify.
