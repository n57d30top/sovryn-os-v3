import assert from "node:assert/strict";
import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
import { initConfig } from "../src/core/config.js";
import {
  SelfAssemblyPlanner,
  SelfAssemblyService,
} from "../src/core/self-assembly/self-assembly-service.js";

async function selfAssemblyRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sovryn-self-assembly-"));
  await copyFile(
    join(process.cwd(), "MECHANISM_MAP.json"),
    join(root, "MECHANISM_MAP.json"),
  );
  await initConfig(root);
  return root;
}

test("self-assembly CLI help is exposed", async () => {
  const help = await executeCli(["--help", "--json"]);
  assert.match((help.data as any).help, /self-assemble status/);
  assert.match((help.data as any).help, /self-assemble audit/);
});

test("mechanism map loads as self-assembly source of truth", async () => {
  const root = await selfAssemblyRoot();
  const planner = new SelfAssemblyPlanner(root);
  const map = await planner.loadMechanismMap();

  assert.equal(map.mechanisms.length >= 50, true);
  assert.equal(
    map.mechanisms.some(
      (mechanism) => mechanism.mechanismId === "daemon_mechanism_router",
    ),
    true,
  );
});

test("self-assembly planner detects underused and manual-only mechanisms", async () => {
  const root = await selfAssemblyRoot();
  const plan = await new SelfAssemblyPlanner(root).plan();

  assert.equal(plan.mechanismCount >= 50, true);
  assert.equal(
    plan.underusedMechanisms.includes("general_scientist_service"),
    true,
  );
  assert.equal(
    plan.underusedMechanisms.includes("external_production_reproduction"),
    true,
  );
  assert.equal(plan.manuallyReachableMechanisms.includes("plugin_api"), true);
  assert.equal(plan.selectedByDaemonButNotExecuted.length, 0);
});

test("self-assembly applies only concrete non-speculative fixes", async () => {
  const root = await selfAssemblyRoot();
  const plan = await new SelfAssemblyService(root).plan();

  assert.equal(plan.noSpeculativeFixes, true);
  assert.equal(plan.noNewGenericLayer, true);
  assert.equal(plan.fundGateUnchanged, true);
  assert.equal(plan.noFakeFund, true);
  assert.equal(
    plan.proposedFixes.every(
      (fix) => fix.speculative === false && fix.affectsFundGate === false,
    ),
    true,
  );
  assert.equal(plan.p0UnwiredMechanisms.length, 0);
  assert.equal(plan.p1UnwiredMechanisms.length, 0);
});

test("self-assembly smoke proves daemon-selected mechanisms are executable", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const hardSeedFlow = smoke.flows.find((flow) => flow.flowId === "B");
  const domainPackProof = hardSeedFlow?.wiringProofs.find(
    (proof) => proof.mechanismId === "domain_packs",
  );

  assert.equal(smoke.failedFlowCount, 0);
  assert.equal(hardSeedFlow?.passed, true);
  assert.equal(
    hardSeedFlow?.mechanisms.includes("daemon_mechanism_router"),
    true,
  );
  assert.equal(hardSeedFlow?.mechanisms.includes("domain_packs"), true);
  assert.equal(domainPackProof?.selectedBy, "MechanismRouter.planForCandidate");
  assert.equal(domainPackProof?.countsAsWired, true);
});

test("computational scientist pipeline is invoked from candidate flow", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const scienceFlow = smoke.flows.find((flow) => flow.flowId === "C");

  assert.equal(scienceFlow?.passed, true);
  assert.equal(scienceFlow?.mechanisms.includes("science_service"), true);
  assert.equal(scienceFlow?.mechanisms.includes("lab_service"), true);
  assert.equal(
    scienceFlow?.producedArtifacts.includes(
      ".sovryn/self-assembly/tool-science-evidence-package.json",
    ),
    true,
  );
});

test("research strategist and knowledge outputs affect candidate priority", async () => {
  const root = await selfAssemblyRoot();
  const run = await new SelfAssemblyService(root).run();
  const priority = (run as any).priorityBridge;

  assert.equal(Boolean(priority.strategyOpportunityId), true);
  assert.equal(Boolean(priority.nextCandidateDirection), true);
  assert.equal(Boolean(priority.nextDomainPriority), true);
  assert.equal(priority.consumedDownstream, true);
});

test("knowledge engine output is consumed downstream", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const knowledgeFlow = smoke.flows.find((flow) => flow.flowId === "J");
  const knowledgeProof = knowledgeFlow?.wiringProofs.find(
    (proof) => proof.mechanismId === "knowledge_engine",
  );

  assert.equal(knowledgeFlow?.passed, true);
  assert.equal(knowledgeFlow?.mechanisms.includes("knowledge_engine"), true);
  assert.equal(
    knowledgeFlow?.producedArtifacts.includes(
      ".sovryn/self-assembly/candidate-domain-priority.json",
    ),
    true,
  );
  assert.equal(knowledgeProof?.countsAsWired, true);
  assert.equal(knowledgeProof?.downstreamConsumed, true);
});

test("package replay corpus flow is connected", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const packageFlow = smoke.flows.find((flow) => flow.flowId === "I");
  const replayProof = packageFlow?.wiringProofs.find(
    (proof) => proof.mechanismId === "os_v16_capability_closure",
  );

  assert.equal(packageFlow?.passed, true);
  assert.equal(packageFlow?.mechanisms.includes("corpus_product_site"), true);
  assert.equal(
    packageFlow?.mechanisms.includes("os_v16_capability_closure"),
    true,
  );
  assert.equal(replayProof?.countsAsWired, true);
});

test("domain-specific flows are selected by router before invocation", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const expected = [
    ["D", "repo_package_reproduction_domain_pack"],
    ["E", "dataset_audit_domain_pack"],
    ["F", "formal_counterexample_domain_pack"],
    ["G", "temporal_evaluation_domain_pack"],
  ];

  for (const [flowId, mechanismId] of expected) {
    const flow = smoke.flows.find((item) => item.flowId === flowId);
    const proof = flow?.wiringProofs.find(
      (item) => item.mechanismId === mechanismId,
    );
    assert.equal(proof?.selectedBy, "MechanismRouter.planForCandidate");
    assert.equal(proof?.countsAsWired, true);
  }
});

test("wired mechanisms satisfy anti-cheat proof criteria", async () => {
  const root = await selfAssemblyRoot();
  const service = new SelfAssemblyService(root);

  await service.smoke();
  const audit = (await service.audit()) as any;
  const wired = audit.mechanismsWired as string[];
  const proofs = audit.mechanismWiringProofs as Array<Record<string, unknown>>;

  assert.equal(audit.antiCheatWiringPassed, true);
  assert.equal(wired.includes("corpus_index_graph_export"), true);
  assert.equal(wired.includes("daemon_hard_seeds"), true);
  assert.equal(wired.includes("daemon_fund_candidate_draft"), true);
  assert.equal(
    wired.includes("scientific_public_data_triage_domain_pack"),
    true,
  );
  for (const mechanismId of wired) {
    const proof = proofs.find(
      (item) => item.mechanismId === mechanismId && item.countsAsWired === true,
    );
    assert.ok(proof, `missing anti-cheat proof for ${mechanismId}`);
    assert.equal(proof.selected, true);
    assert.equal(proof.invoked, true);
    assert.equal(proof.artifactProduced, true);
    assert.equal(proof.downstreamConsumed, true);
    assert.equal(proof.contractTested, true);
  }
});

test("self-assembly anti-cheat recognizes hard-seed proof shape", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const hardSeedProof = smoke.wiringProofs.find(
    (proof) => proof.mechanismId === "daemon_hard_seeds",
  );

  assert.equal(hardSeedProof?.selected, true);
  assert.equal(hardSeedProof?.invoked, true);
  assert.equal(hardSeedProof?.artifactProduced, true);
  assert.equal(hardSeedProof?.downstreamConsumed, true);
  assert.equal(hardSeedProof?.countsAsWired, true);
});

test("corpus index graph export proves selected export source chain", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const corpusProof = smoke.wiringProofs.find(
    (proof) => proof.mechanismId === "corpus_index_graph_export",
  );

  assert.equal(
    corpusProof?.selectedBy,
    "SelfAssemblyPlanner corpus anomaly priority bridge",
  );
  assert.equal(corpusProof?.invokedBy, "CorpusService.graph");
  assert.equal(
    corpusProof?.outputArtifact,
    ".sovryn/corpus/public/corpus-graph.json",
  );
  assert.equal(corpusProof?.countsAsWired, true);
});

test("nominal or unavailable mechanisms are not counted as wired", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const failedCorpusProof = smoke.wiringProofs.find(
    (proof) =>
      proof.mechanismId === "corpus_product_site" &&
      proof.countsAsWired === false,
  );

  assert.ok(failedCorpusProof);
  assert.equal(smoke.mechanismsWired.includes("corpus_product_site"), false);
});

test("self-assembly does not create fake Fund or fake 100", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const dispositionFlow = smoke.flows.find((flow) => flow.flowId === "H");

  assert.equal(dispositionFlow?.passed, true);
  assert.equal(dispositionFlow?.noFundCreated, true);
  assert.equal(smoke.noFundFoundCreated, true);
  assert.equal(smoke.noToolInstallOnlyDiscoveryFund, true);
  assert.equal(smoke.noFake100, true);
});

test("self-assembly audit passes after smoke artifacts exist", async () => {
  const root = await selfAssemblyRoot();
  const service = new SelfAssemblyService(root);

  await service.smoke();
  const audit = await service.audit();

  assert.equal(audit.passed, true);
  assert.equal(audit.noFundGateChange, true);
  assert.equal(audit.noFakeFund, true);
  assert.equal(audit.noFake100, true);
  assert.equal(
    audit.finalStatus,
    "self_assembly_wiring_complete_with_protected_state_caveats",
  );
});
