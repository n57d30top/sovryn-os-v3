#!/usr/bin/env node
const { execFileSync } = require("child_process");
const { existsSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const candidateId = "DISCOVERY-BENCH-TRIAGE-SECOND-INDEPENDENT-SURVIVOR-001";
const allowedStatuses = new Set([
  "exact_product_metrics_reproduced_from_public_raw_data",
  "public_raw_replay_reproduced_with_rounding_caveat",
]);
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

function markdown(result) {
  const lines = [
    "# Reviewer Replay Quickcheck Result",
    "",
    `Status: ${result.passed ? "passed" : "failed"}`,
    `Replay status: ${result.replayStatus}`,
    `Validated rows: ${result.validatedRows}`,
    `Fund found: ${result.fundFound}`,
    `Counts for discovery score: ${result.countsForDiscoveryScore}`,
    "",
    "This quickcheck is public replay inspectability evidence only. It is not external validation and cannot create FUND_FOUND.",
  ];
  if (result.failures.length > 0) {
    lines.push("", "## Failures", "");
    for (const failure of result.failures) lines.push(`- ${failure}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const cwd = __dirname;
  const replayScript = join(cwd, "reproduce_second_survivor_benchmark.js");
  const replayResultPath = join(cwd, "standalone_replay_results.json");
  check(
    existsSync(replayScript),
    "missing reproduce_second_survivor_benchmark.js",
  );
  if (failures.length === 0) {
    execFileSync(process.execPath, [replayScript], { cwd, stdio: "inherit" });
  }
  check(
    existsSync(replayResultPath),
    "missing standalone_replay_results.json after replay",
  );
  const report = existsSync(replayResultPath)
    ? JSON.parse(readFileSync(replayResultPath, "utf8"))
    : {};
  const rows = Array.isArray(report.results) ? report.results : [];
  check(
    report.kind === "second_survivor_standalone_public_replay",
    "unexpected replay kind",
  );
  check(report.candidateId === candidateId, "candidateId mismatch");
  check(
    allowedStatuses.has(report.resultStatus),
    "replay status is not accepted for public inspectability",
  );
  check(
    report.productMetricsWithinRoundingTolerance === true,
    "Product metrics are not within rounding tolerance",
  );
  check(
    report.fundFound === false,
    "quickcheck must not pass if fundFound is true",
  );
  check(
    report.countsForDiscoveryScore === false,
    "quickcheck must not pass if package counts for discovery score",
  );
  check(
    /not external validation/i.test(String(report.noOverclaim || "")),
    "no-overclaim text must state this is not external validation",
  );
  check(rows.length === 7, "expected seven public replay rows");
  for (const row of rows) {
    const label = row.claimId || row.taskId || "unknown-row";
    check(
      /^[a-f0-9]{64}$/.test(String(row.rawSha256 || "")),
      `${label}: rawSha256 missing or invalid`,
    );
    check(
      row.productMetricsWithinRoundingTolerance === true,
      `${label}: Product metrics outside rounding tolerance`,
    );
    check(
      row.negativeControlBehaved === true,
      `${label}: negative control did not behave`,
    );
    check(
      row.holdoutStatus === "survived",
      `${label}: holdout did not survive`,
    );
    check(
      row.rivalStatus === "scoped_or_weakened",
      `${label}: rival was not scoped or weakened`,
    );
    check(
      number(row.randomVsHoldoutDelta) >= 0.08,
      `${label}: random-vs-holdout delta below threshold`,
    );
    check(
      number(row.modelVsBaselineDelta) > 0.04,
      `${label}: model-vs-baseline delta not above simple baseline threshold`,
    );
  }
  const result = {
    kind: "second_survivor_reviewer_replay_quickcheck",
    generatedAt: new Date().toISOString(),
    candidateId,
    replayReran: failures.length === 0,
    passed: failures.length === 0,
    failures,
    replayStatus: report.resultStatus || null,
    validatedRows: rows.length,
    productMetricsWithinRoundingTolerance:
      report.productMetricsWithinRoundingTolerance === true,
    fundFound: report.fundFound === true,
    countsForDiscoveryScore: report.countsForDiscoveryScore === true,
    externalValidationClaimed: false,
    noOverclaim:
      "Reviewer quickcheck is public replay inspectability evidence only; it is not external validation and cannot create FUND_FOUND.",
  };
  writeFileSync(
    join(cwd, "reviewer_replay_quickcheck_result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  writeFileSync(
    join(cwd, "REVIEWER_REPLAY_QUICKCHECK_RESULT.md"),
    markdown(result),
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
