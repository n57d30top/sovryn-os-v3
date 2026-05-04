# Node Alpha

Node Alpha is Sovryn's dedicated Linux research machine concept. It is the
agent's working machine for legitimate research, software development,
prototyping, documentation, benchmarking, and preparation of open-source
research artifacts.

For the MVP, Node Alpha runs locally through the shell adapter:

```bash
sovryn node register alpha --host local
sovryn node status alpha
sovryn node run alpha <mission-id>
sovryn node run alpha <mission-id> --mode autonomous --max-steps 25
sovryn node run alpha <mission-id> --mode validate --profile sandbox-local
sovryn node run alpha <mission-id> --mode validate --profile container-local
sovryn node run alpha <mission-id> --mode validate --profile container-netoff
sovryn worker doctor --profile container-local
sovryn worker doctor --profile container-netoff
sovryn worker doctor --all
sovryn worker policy check
sovryn worker run <mission-id> --profile container-netoff
sovryn node alpha toolchain plan <factory-id>
sovryn node alpha toolchain doctor
sovryn node alpha toolchain install <toolchain-plan-id> --profile container-local
sovryn node alpha toolchain status
sovryn node logs alpha <mission-id>
sovryn node artifacts alpha <mission-id>
```

The architecture is designed for later SSH, `sovryn-agentd`, container, and VM
backends. Node Alpha can create workspaces, run commands, inspect environment
state, collect artifacts, and stream logs.

`--mode validation` is the default smoke run. It checks the local toolchain and
runs the prototype tests.

`--mode autonomous` runs a deterministic research loop:

- create a research plan
- execute bounded command steps
- write a command journal
- create landscape, prior-art, source-review, synthesis, skeptic, benchmark, and summary artifacts
- review `evidence/public-source-search.json` at metadata level
- write `evidence/source-reviews.json`, `SOURCE_REVIEWS.md`, and `RESEARCH_SYNTHESIS.md`
- run prototype verification
- score expected artifacts and research-evidence completeness
- copy evidence back to the invention dossier

The score is an artifact completeness score, not a research quality score. It
records expected, present, and missing artifacts plus basic quality signals such
as prior-art, prototype, tests, defensive publication, source reviews, and
skeptic review. The `researchEvidenceScore` is deterministic: concrete sources
and source-type diversity increase it; query links, adapter failures, high
novelty-risk sources, and unresolved research gaps reduce it.

The loop is deliberately deterministic in the MVP. Future providers can replace
or enrich the steps with full source reading, public search, local models,
browser automation, containers, SSH, or `sovryn-agentd`.

The Autonomous Open Research Factory records a factory-level phase sequence that
Node Alpha can participate in as the execution worker:

- `factory_plan`
- `source_discovery`
- `source_reading`
- `feature_matrix`
- `novelty_gap_analysis`
- `candidate_generation`
- `candidate_selection`
- `invention_generation`
- `prototype_build`
- `test_generation`
- `skeptic_review`
- `factory_scoring`
- `release_packaging`

The Alpha MVP runs this sequence deterministically through the factory service
and generates normal Open Invention missions that can then be validated with
`sovryn node run alpha <mission-id> --mode autonomous`.

Node Alpha is not a security sandbox unless paired with containers, VMs,
firewalling, network namespaces, or equivalent OS controls. The local MVP uses
policy checks and command blocking, not kernel isolation.

Alpha.14 adds `container-local` as a sandbox-ready execution profile. It checks
Docker or Podman with `sovryn worker doctor --profile container-local`. When a
runtime is available, Node Alpha runs generated prototype tests in a container
with network disabled where supported and without mounting the user's home
directory. When no runtime is available, it writes degraded/unavailable
execution evidence and does not silently run on the host. This is stronger than
`sandbox-local`, but it is still not a formal OS isolation proof or a hardened
VM boundary.

Alpha.19 adds secure worker runtime profiles and policy evidence. The
`container-netoff` profile is a stricter container profile that requires Docker
or Podman, requests `--network none`, records CPU/memory limit intent, mounts
only the generated prototype workspace for validation, and writes summary
execution evidence. If no runtime is available, the result is explicitly
unavailable; Node Alpha must not silently run the command on the host.

Worker reports are stored under:

```text
.sovryn/workers/
  doctor-<profile>.json
  doctor-all.json
  worker-policy.json
  worker-sandbox-report.json
  network-policy-report.json
  filesystem-mount-report.json
  resource-limit-report.json
  supply-chain-risk-report.json
```

The reports distinguish low, medium, medium-high, and high-assurance profiles.
`vm-local` and `ci-isolated` currently report unavailable until real backends
are configured. `container-netoff` is a stronger local worker profile, not a
guarantee of safe execution for hostile code.

Autonomous agents may work in mission workspaces and install legitimate
development dependencies when policy permits. They may not access secrets
directly unless Sovryn grants a controlled capability.

## Toolchain Autonomy

Alpha.16 adds controlled Node Alpha toolchain planning. The goal is not to let
an autonomous worker run arbitrary host installs. Instead, Sovryn records what a
research run needs, checks what is already available, reviews policy, and writes
auditable evidence:

```text
.sovryn/nodes/alpha/toolchains/
  toolchain-plan.json
  toolchain-policy-review.json
  installed-tools.json
  install-log.redacted.json
  toolchain-lock.json
  toolchain-doctor.json
```

The current allowlist covers research and build tools such as `jq`, `rg`, `git`,
`node`, `npm`, `python3`, `pipx`, `graphviz`, `pandoc`, `pdftotext`,
`docker`/`podman`, and `ts-node`.

Host installation is blocked by default. The policy review records that `sudo`,
host package managers, `curl | sh`, global host npm installs, and host Python
user installs are not allowed for autonomous Node Alpha. Missing tools are
reported as missing/blocked and require an approved worker profile or manual
operator action. The MVP can check `container-local` availability but does not
pretend that a disposable container check is persistent tool installation.

## Public Beta Worker Expectations

Beta.22 adds a public beta demo path that prefers `container-netoff` for
generated prototype validation:

```bash
node dist/cli.js worker doctor --profile container-netoff --json
node dist/cli.js public-beta check --json
npm run demo:public-beta
```

If Docker or Podman is unavailable, Sovryn records the limitation explicitly and
does not silently fall back from the requested container profile to host
execution. `sandbox-local` remains a lower-assurance constrained command
profile, not a kernel-level sandbox. For stronger isolation, use a hardened
container, VM, dedicated user, and network controls.
