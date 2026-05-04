import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { hashEvidence } from "../invention/pipeline.js";

export type AntiTemplateReport = {
  kind: "anti_template_report";
  resultId: string;
  specificityScore: number;
  sourceSpecificityScore: number;
  prototypeRelevanceScore: number;
  testNontrivialityScore: number;
  limitationHonestyScore: number;
  nonTemplateLanguageScore: number;
  claimEvidenceGroundingScore: number;
  counterEvidenceRelevanceScore: number;
  publicReadabilityScore: number;
  repeatedPhraseCount: number;
  genericPhraseCount: number;
  domainTermCount: number;
  statusRecommendation:
    | "autopublished"
    | "review_ready"
    | "needs_revision"
    | "demo_pilot"
    | "blocked";
  findings: Array<{
    findingId: string;
    severity: "info" | "warn" | "block";
    message: string;
  }>;
  evidenceHash: string;
};

export type ReadabilityReport = {
  kind: "readability_report";
  resultId: string;
  sentenceCount: number;
  averageWordsPerSentence: number;
  sectionCount: number;
  explainsProblem: boolean;
  explainsMethod: boolean;
  explainsLimitations: boolean;
  explainsSafetyScope: boolean;
  readabilityScore: number;
  evidenceHash: string;
};

const GENERIC_PHRASES = [
  "evidence-bound open invention",
  "autonomous open-research artifact",
  "requires human interpretation",
  "not a patent filing",
  "not a patentability opinion",
  "possible differentiator",
  "candidate novelty axis",
  "automated policy gates",
  "dry-run ready",
];

const SPECIFIC_DOMAIN_TERMS = [
  "molecule",
  "smiles",
  "boiling",
  "unit normalization",
  "pint",
  "energy",
  "kwh",
  "weather",
  "timestamp",
  "pandas",
  "patch",
  "dependency",
  "postinstall",
  "acorn",
  "provenance",
  "container-netoff",
  "source card",
  "claim feature",
  "counter evidence",
  "prototype",
  "benchmark",
];

const NONTRIVIAL_TEST_TERMS = [
  "detect",
  "reject",
  "normalize",
  "outlier",
  "duplicate",
  "missing",
  "provenance",
  "dependency",
  "container-netoff",
  "assert",
  "expected",
];

export async function analyzePublicResultQuality(input: {
  resultId: string;
  root: string;
}): Promise<AntiTemplateReport & { readability: ReadabilityReport }> {
  const files = await collectTextFiles(input.root);
  const allText = files.map((file) => file.text).join("\n");
  const readme = fileText(files, "README.md");
  const claimText =
    fileText(files, "CLAIM_FEATURE_MATRIX.md") +
    "\n" +
    fileText(files, "claim-feature-matrix.summary.json");
  const counterText =
    fileText(files, "COUNTER_EVIDENCE.md") +
    "\n" +
    fileText(files, "counter-evidence.summary.json");
  const limitations =
    fileText(files, "TOOL_LIMITATIONS.md") +
    "\n" +
    fileText(files, "LIMITATIONS.md") +
    "\n" +
    fileText(files, "README.md");
  const tests = files
    .filter((file) =>
      /(?:^|\/)(tests?|prototype)\/.+\.(?:js|mjs|ts|py)$/i.test(file.path),
    )
    .map((file) => file.text)
    .join("\n");
  const prototype = files
    .filter((file) => /(?:^|\/)prototype\//i.test(file.path))
    .map((file) => file.text)
    .join("\n");
  const repeatedPhraseCount = repeatedPhrases(allText);
  const genericPhraseCount = phraseHits(allText, GENERIC_PHRASES);
  const domainTermCount = phraseHits(allText, SPECIFIC_DOMAIN_TERMS);
  const sourceSpecificityScore = clampScore(
    35 +
      uniqueTitleLikeCount(allText) * 8 +
      phraseHits(allText, ["source", "citation", "card"]) * 4,
  );
  const prototypeRelevanceScore = clampScore(
    prototype.length > 120
      ? 45 + phraseHits(prototype, SPECIFIC_DOMAIN_TERMS) * 8
      : 20,
  );
  const testNontrivialityScore = clampScore(
    tests.length > 80 ? 35 + phraseHits(tests, NONTRIVIAL_TEST_TERMS) * 7 : 15,
  );
  const limitationHonestyScore = clampScore(
    30 +
      phraseHits(limitations, [
        "limitation",
        "not a",
        "toy",
        "synthetic",
        "human review",
      ]) *
        10,
  );
  const nonTemplateLanguageScore = clampScore(
    100 -
      genericPhraseCount * 5 -
      repeatedPhraseCount * 8 +
      domainTermCount * 2,
  );
  const claimEvidenceGroundingScore = clampScore(
    30 +
      phraseHits(claimText, [
        "source",
        "evidence",
        "overlap",
        "differentiator",
      ]) *
        8 +
      phraseHits(claimText, SPECIFIC_DOMAIN_TERMS) * 4,
  );
  const counterEvidenceRelevanceScore = clampScore(
    counterText.trim().length > 0
      ? 30 +
          phraseHits(counterText, ["existing", "overlap", "weaken", "risk"]) *
            10 +
          phraseHits(counterText, SPECIFIC_DOMAIN_TERMS) * 4
      : 10,
  );
  const readability = buildReadabilityReport(input.resultId, readme || allText);
  const specificityScore = Math.round(
    average([
      sourceSpecificityScore,
      prototypeRelevanceScore,
      testNontrivialityScore,
      limitationHonestyScore,
      nonTemplateLanguageScore,
      claimEvidenceGroundingScore,
      counterEvidenceRelevanceScore,
      readability.readabilityScore,
    ]),
  );
  const findings = [
    specificityScore < 70
      ? finding(
          "low-specificity",
          "warn",
          "Result reads too generic or weakly domain-grounded.",
        )
      : null,
    testNontrivialityScore < 65
      ? finding(
          "trivial-tests",
          "warn",
          "Prototype tests appear missing, trivial, or not domain-specific.",
        )
      : null,
    counterEvidenceRelevanceScore < 50
      ? finding(
          "weak-counter-evidence",
          "warn",
          "Counter-evidence is missing or not specific to the result.",
        )
      : null,
    genericPhraseCount > 18
      ? finding(
          "template-language",
          "warn",
          "Repeated template language dominates the public artifact.",
        )
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const statusRecommendation =
    specificityScore < 45
      ? "demo_pilot"
      : specificityScore < 65
        ? "needs_revision"
        : specificityScore >= 82
          ? "autopublished"
          : "review_ready";
  const report: AntiTemplateReport & { readability: ReadabilityReport } = {
    kind: "anti_template_report",
    resultId: input.resultId,
    specificityScore,
    sourceSpecificityScore,
    prototypeRelevanceScore,
    testNontrivialityScore,
    limitationHonestyScore,
    nonTemplateLanguageScore,
    claimEvidenceGroundingScore,
    counterEvidenceRelevanceScore,
    publicReadabilityScore: readability.readabilityScore,
    repeatedPhraseCount,
    genericPhraseCount,
    domainTermCount,
    statusRecommendation,
    findings,
    readability,
    evidenceHash: "",
  };
  report.evidenceHash = hashEvidence({ ...report, evidenceHash: "" });
  return report;
}

export function buildReadabilityReport(
  resultId: string,
  text: string,
): ReadabilityReport {
  const sentences = text
    .split(/[.!?]\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const words = text.match(/[A-Za-z0-9_-]+/g) ?? [];
  const sectionCount = (text.match(/^##?\s+/gm) ?? []).length;
  const averageWordsPerSentence =
    sentences.length === 0 ? 0 : Math.round(words.length / sentences.length);
  const explainsProblem = /\b(problem|goal|purpose|audits?|detects?)\b/i.test(
    text,
  );
  const explainsMethod =
    /\b(method|prototype|tool|scores?|normaliz|analysis)\b/i.test(text);
  const explainsLimitations =
    /\b(limitations?|not a|does not|outside scope)\b/i.test(text);
  const explainsSafetyScope =
    /\b(safety|scope|synthetic|toy|defensive)\b/i.test(text);
  const readabilityScore = clampScore(
    35 +
      (explainsProblem ? 15 : 0) +
      (explainsMethod ? 15 : 0) +
      (explainsLimitations ? 15 : 0) +
      (explainsSafetyScope ? 10 : 0) +
      Math.min(sectionCount, 6) * 2 -
      Math.max(0, averageWordsPerSentence - 28),
  );
  const report: ReadabilityReport = {
    kind: "readability_report",
    resultId,
    sentenceCount: sentences.length,
    averageWordsPerSentence,
    sectionCount,
    explainsProblem,
    explainsMethod,
    explainsLimitations,
    explainsSafetyScope,
    readabilityScore,
    evidenceHash: "",
  };
  report.evidenceHash = hashEvidence({ ...report, evidenceHash: "" });
  return report;
}

async function collectTextFiles(
  root: string,
): Promise<Array<{ path: string; text: string }>> {
  const out: Array<{ path: string; text: string }> = [];
  for (const file of await listFiles(root)) {
    const info = await stat(file).catch(() => null);
    if (!info || info.size > 750_000) continue;
    const buffer = await readFile(file).catch(() => null);
    if (!buffer || buffer.includes(0)) continue;
    out.push({
      path: relative(root, file).replace(/\\/g, "/"),
      text: buffer.toString("utf8"),
    });
  }
  return out.sort((left, right) => left.path.localeCompare(right.path));
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules" || entry === ".venv")
      continue;
    const path = join(root, entry);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (info.isDirectory()) out.push(...(await listFiles(path)));
    else if (info.isFile()) out.push(path);
  }
  return out;
}

function fileText(
  files: Array<{ path: string; text: string }>,
  suffix: string,
): string {
  return files
    .filter((file) => file.path.endsWith(suffix))
    .map((file) => file.text)
    .join("\n");
}

function phraseHits(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase.toLowerCase()))
    .length;
}

function repeatedPhrases(text: string): number {
  const lines = text
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 30 && !line.startsWith("{"));
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);
  return [...counts.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);
}

function uniqueTitleLikeCount(text: string): number {
  const titles = new Set<string>();
  for (const match of text.matchAll(
    /\b[A-Z][A-Za-z0-9-]{3,}(?:\s+[A-Z]?[A-Za-z0-9-]{3,}){0,4}/g,
  )) {
    titles.add(match[0].toLowerCase());
  }
  return Math.min(titles.size, 10);
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function finding(
  findingId: string,
  severity: "info" | "warn" | "block",
  message: string,
): AntiTemplateReport["findings"][number] {
  return { findingId, severity, message };
}
