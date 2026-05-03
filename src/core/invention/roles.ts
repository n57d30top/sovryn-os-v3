import type { InventionDossier } from "./invention-types.js";

export type RoleOutput = {
  role: string;
  summary: string;
  artifacts: string[];
};

export class Scout {
  run(brief: string): RoleOutput {
    return {
      role: "Scout",
      summary: `Identified broad technical landscape for: ${brief}`,
      artifacts: ["evidence/landscape_scan.json", "PRIOR_ART.md"],
    };
  }
}

export class PriorArtMapper {
  run(brief: string): RoleOutput {
    return {
      role: "PriorArtMapper",
      summary: `Prepared non-legal prior-art mapping notes for: ${brief}`,
      artifacts: ["PRIOR_ART.md"],
    };
  }
}

export class Inventor {
  run(dossier: InventionDossier): RoleOutput {
    return {
      role: "Inventor",
      summary: `Selected concrete open invention candidate: ${dossier.title}`,
      artifacts: ["SPEC.md", "DEFENSIVE_PUBLICATION.md"],
    };
  }
}

export class Skeptic {
  run(dossier: InventionDossier): RoleOutput {
    return {
      role: "Skeptic",
      summary: `Checked vagueness, obvious weaknesses, enablement gaps, and publication safety for ${dossier.title}.`,
      artifacts: ["NOVELTY_NOTES.md", "SAFETY_REVIEW.md"],
    };
  }
}

export class Builder {
  run(dossier: InventionDossier): RoleOutput {
    return {
      role: "Builder",
      summary: `Created prototype and deterministic tests for ${dossier.title}.`,
      artifacts: [dossier.prototypePath, dossier.testsPath],
    };
  }
}

export class DocWriter {
  run(dossier: InventionDossier): RoleOutput {
    return {
      role: "DocWriter",
      summary: `Created open invention documentation for ${dossier.title}.`,
      artifacts: [
        "README.md",
        "SPEC.md",
        "DEFENSIVE_PUBLICATION.md",
        "NOVELTY_NOTES.md",
        "SAFETY_REVIEW.md",
      ],
    };
  }
}

export class Publisher {
  run(dossier: InventionDossier): RoleOutput {
    return {
      role: "Publisher",
      summary: `Prepared publication request for ${dossier.title}. GitHub credentials remain with Sovryn Controller.`,
      artifacts: ["evidence/publication-review.json", "release/"],
    };
  }
}
