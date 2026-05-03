import type { InventionDossier } from "./invention-types.js";

export function renderReadme(dossier: InventionDossier): string {
  return `# ${dossier.title}

${dossier.abstract}

## Open Invention

This repository is an open-source research artifact and defensive publication.
It is not a patent filing tool and does not claim legal patent protection.

## Technical Field

${dossier.technicalField}

## Problem

${dossier.problem}

## Proposed Solution

${dossier.proposedSolution}

## Prototype

See [prototype/](prototype/).

## Validation

Run:

\`\`\`bash
cd prototype
npm test
\`\`\`

## License

Code: ${dossier.license}. Documentation: CC-BY-4.0 where applicable.
`;
}

export function renderSpec(dossier: InventionDossier): string {
  return `# Specification: ${dossier.title}

## Abstract

${dossier.abstract}

## Architecture

${dossier.architecture}

## Algorithm or Method

${dossier.algorithm}

## Implementation Notes

${dossier.implementationNotes}

## Variants

${list(dossier.variants)}

## Advantages

${list(dossier.advantages)}

## Limitations

${list(dossier.limitations)}
`;
}

export function renderDefensivePublication(dossier: InventionDossier): string {
  return `# Defensive Publication: ${dossier.title}

## Publication Date

Draft generated ${dossier.createdAt}. Publish only after Sovryn publication gates pass.

## Abstract

${dossier.abstract}

## Technical Field

${dossier.technicalField}

## Problem

${dossier.problem}

## Background and Existing Approaches

${dossier.background}

## Summary of the Open Invention

${dossier.proposedSolution}

## Detailed Technical Description

${dossier.implementationNotes}

## System Architecture

${dossier.architecture}

## Algorithm or Method

${dossier.algorithm}

## Reference Implementation

The reference implementation is in \`prototype/\`.

## Variants and Embodiments

${list(dossier.variants)}

## Advantages

${list(dossier.advantages)}

## Limitations

${list(dossier.limitations)}

## Safety Considerations

${list(dossier.safetyNotes)}

## Keywords

open invention, defensive publication, autonomous research, evidence, open source

## License

${dossier.license} for code; CC-BY-4.0 for documentation where appropriate.

## Repository

Repository URL is assigned during Sovryn GitHub publication.
`;
}

export function renderPriorArt(dossier: InventionDossier): string {
  return `# Prior Art Notes

These notes are not legal conclusions and do not establish patentability,
freedom to operate, validity, or novelty. Manual or agent-assisted public
research is required before serious use.

## Current Mapping

${list(dossier.priorArt)}

## Prior-Art Matrix

| Source | Title | Relevance | Overlap | Difference | Citation |
| --- | --- | --- | --- | --- | --- |
${dossier.priorArtMatrix.map((item) => `| ${item.sourceType} | ${escapeTable(item.title)} | ${item.relevance} | ${escapeTable(item.overlap)} | ${escapeTable(item.difference)} | ${escapeTable(item.citation ?? "pending")} |`).join("\n")}

## Search Plan

- Search public papers, repositories, standards, and documentation.
- Compare architecture, algorithm, implementation, and validation claims.
- Record citations and URLs in future evidence artifacts.
`;
}

export function renderNoveltyNotes(dossier: InventionDossier): string {
  return `# Novelty Notes

These notes are technical hypotheses, not legal opinions.

${list(dossier.noveltyNotes)}
`;
}

export function renderSafetyReview(dossier: InventionDossier): string {
  return `# Safety Review

Sovryn blocks publication of malware, credential theft, phishing kits, exploit
operationalization, spam automation, dangerous weaponization, harmful
biological/chemical instructions, private data, copyrighted bulk material, and
leaked secrets.

## Notes

${list(dossier.safetyNotes)}

## Review Status

Template review generated. Serious contexts require human review.
`;
}

export function renderCitation(dossier: InventionDossier): string {
  return `cff-version: 1.2.0
title: "${escapeYaml(dossier.title)}"
message: "If you use this open invention, cite the defensive publication and repository."
type: software
authors:
  - name: "n57d30top"
date-released: "${dossier.createdAt.slice(0, 10)}"
license: "Apache-2.0"
`;
}

export const APACHE_2_LICENSE = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright 2026 Sovryn OS contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
`;

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n") || "- Not yet specified.";
}

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"');
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
