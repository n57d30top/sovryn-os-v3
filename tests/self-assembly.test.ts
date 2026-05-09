import assert from "node:assert/strict";
import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeCli } from "../src/cli/index.js";
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

  assert.equal(smoke.failedFlowCount, 0);
  assert.equal(hardSeedFlow?.passed, true);
  assert.equal(
    hardSeedFlow?.mechanisms.includes("daemon_mechanism_router"),
    true,
  );
  assert.equal(hardSeedFlow?.mechanisms.includes("domain_packs"), true);
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

  assert.equal(knowledgeFlow?.passed, true);
  assert.equal(knowledgeFlow?.mechanisms.includes("knowledge_engine"), true);
  assert.equal(
    knowledgeFlow?.producedArtifacts.includes(
      ".sovryn/self-assembly/candidate-domain-priority.json",
    ),
    true,
  );
});

test("package replay corpus flow is connected", async () => {
  const root = await selfAssemblyRoot();
  const smoke = await new SelfAssemblyService(root).smoke();
  const packageFlow = smoke.flows.find((flow) => flow.flowId === "I");

  assert.equal(packageFlow?.passed, true);
  assert.equal(packageFlow?.mechanisms.includes("corpus_product_site"), true);
  assert.equal(
    packageFlow?.mechanisms.includes("os_v16_capability_closure"),
    true,
  );
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
