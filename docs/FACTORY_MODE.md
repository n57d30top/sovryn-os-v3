# Factory Mode

Factory Mode has two CLI surfaces.

The legacy shortcut turns a rough research goal into one complete Open
Invention mission plus deterministic invention-level factory evidence:

```bash
sovryn factory-open "A factory for verifiable open-source invention research"
```

It runs the normal Open Invention creation path first. Sovryn still creates the
dossier, prototype scaffold, tests, public-source search evidence,
source-reading evidence, defensive publication, license, and publication gates.

Factory Mode then writes:

```text
.sovryn/inventions/<slug>/FACTORY_REPORT.md
.sovryn/inventions/<slug>/evidence/factory-features.json
.sovryn/inventions/<slug>/evidence/novelty-gaps.json
.sovryn/inventions/<slug>/evidence/invention-candidates.json
.sovryn/inventions/<slug>/evidence/factory-selection.json
.sovryn/inventions/<slug>/evidence/factory-score.json
```

The deterministic MVP extracts technical features from public-source search and
source-reading evidence, maps novelty gaps, generates candidate Open
Inventions, selects one, and updates the dossier with the selected candidate.

Real GitHub publication is blocked when `factory-score.json` exists but the
factory score is weak. Dry-run packaging remains available for inspection.

Factory Mode is strongest when both public search and source reading are
enabled:

```json
{
  "research": {
    "publicSearch": {
      "enabled": true
    },
    "sourceReading": {
      "enabled": true
    }
  }
}
```

Generated content must still be reviewed for serious contexts. Factory Mode
publishes Open Inventions and Defensive Publications; it does not file patents
or make legal patentability, novelty, or freedom-to-operate conclusions.

The Autonomous Open Research Factory is the factory-level MVP:

```bash
sovryn factory run "Develop open-source methods for self-verifying autonomous research agents" --json
sovryn factory status <factory-id> --json
sovryn factory review <factory-id> --json
sovryn factory package <factory-id> --json
```

It writes `.sovryn/factory/<slug>/` with research-plan, source-discovery,
source-reading, feature-matrix, novelty-gap, candidate, selected-candidate,
factory-score, report, limitations, and curated public release artifacts. It
also triggers normal Open Invention missions for selected candidates. See
`docs/RESEARCH_FACTORY.md`.
