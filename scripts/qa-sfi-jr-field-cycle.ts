import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

const temporal=read('src/lib/mihm/fieldTemporalPersistence.ts');
const phenomena=read('src/lib/mihm/distributedPhenomena.ts');
const dispatch=read('src/lib/mihm/scientificMethodDispatch.ts');
const jr=read('src/lib/mihm/jrFieldCycle.ts');
const world=read('src/app/api/external/v1/world/route.ts');
const cron=read('src/app/api/cron/world-observatory/route.ts');
const root=read('src/app/[scene]/page.tsx');

for(const token of [
  'SFI-FIELD-TEMPORAL-EPOCH-1.0',
  'historicalRewriteAllowed: false',
  'database timestamps into observed-world time',
]) assert.ok(temporal.includes(token),`temporal_epoch_contract_missing:${token}`);

for(const token of [
  'SFI-DISTRIBUTED-PHENOMENON-1.0',
  "phenomenonEstablished: false",
  'doesNotImplyCausality',
  'doesNotImplyAttractor',
  'doesNotImplyRegimeChange',
]) assert.ok(phenomena.includes(token),`distributed_phenomenon_boundary_missing:${token}`);

for(const token of [
  'PERSISTED_EVIDENCE_IDS_REQUIRED_BEFORE_EXECUTION',
  'runMethodLabSimulation',
  "epistemicClass:'simulated'",
  'materialPerturbationExecuted:false',
  'canonicalMutation:false',
]) assert.ok(dispatch.includes(token),`scientific_dispatch_boundary_missing:${token}`);

for(const token of [
  "graph.sourceState === 'observed' && graph.readPlane === 'SUPABASE'",
  'persistFieldTemporalEpoch',
  'persistDistributedPhenomenonCandidate',
  'dispatchScientificMethodToLab',
  "decision === 'REVIEW_PERTURBATION_CANDIDATE'",
  'materialPerturbationExecuted:false',
  'canonicalMutation:false',
  'returnFabricated:false',
]) assert.ok(jr.includes(token),`jr_field_cycle_boundary_missing:${token}`);

assert.ok(world.includes('runJrFieldCycle'), 'world_mcp_must_continue_into_jr');
assert.ok(cron.includes('runJrFieldCycle'), 'world_cron_must_continue_into_jr');
assert.ok(root.includes('projectDistributedPhenomenaForRoot'), 'root_must_project_distributed_phenomena');
assert.ok(root.includes('distributedPhenomenonProjection'), 'root_distributed_phenomenon_projection_missing');

assert.equal(/runGovernedExecutionRouter|transitionOperationalCase|governanceDecision/.test(jr),false,'jr_must_not_execute_governed_or_material_actions');
assert.equal(/\.from\('graph_nodes'\).*insert|\.from\('graph_edges'\).*insert/.test(jr),false,'jr_must_not_mutate_canonical_graph_store_directly');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-JR-FIELD-CYCLE-QA-1.0',
  appendOnlyTemporalEpochs:true,
  distributedPhenomenonCandidate:true,
  persistedEvidenceRequiredForMethodRun:true,
  methodLabSimulationOnly:true,
  materialPerturbationExecution:false,
  canonicalMutation:false,
  fabricatedReturn:false,
  rootSingleFieldProjection:true,
  worldContinuation:true,
},null,2));
