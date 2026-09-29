import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

const temporal=read('src/lib/mihm/fieldTemporalPersistence.ts');
const phenomena=read('src/lib/mihm/distributedPhenomena.ts');
const scientificRuntime=read('src/lib/mihm/scientificMethodRuntime.ts');
const dispatch=read('src/lib/mihm/scientificMethodDispatch.ts');
const activeObservation=read('src/lib/mihm/activeObservationQueue.ts');
const perturbation=read('src/lib/mihm/perturbationReviewQueue.ts');
const returnReconciliation=read('src/lib/mihm/jrReturnReconciliation.ts');
const experimentContract=read('src/lib/method-lab/experimentContract.ts');
const experimentPersistence=read('src/lib/method-lab/experimentPersistence.ts');
const methodReadModel=read('src/lib/method-lab/readModel.ts');
const jr=read('src/lib/mihm/jrFieldCycle.ts');
const world=read('src/app/api/external/v1/world/route.ts');
const cron=read('src/app/api/cron/world-observatory/route.ts');
const root=read('src/app/[scene]/page.tsx');
const rootView=read('src/components/sfi/RootNeuralGraphView.tsx');

for(const token of [
  'SFI-FIELD-TEMPORAL-EPOCH-1.0',
  'historicalRewriteAllowed: false',
  'database timestamps into observed-world time',
  'currentWeight',
  'previousWeight',
  'capacity: capacityObservation(node)',
]) assert.ok(temporal.includes(token),`temporal_epoch_contract_missing:${token}`);

for(const token of [
  'SFI-DISTRIBUTED-PHENOMENON-1.0',
  "phenomenonEstablished: false",
  'doesNotImplyCausality',
  'doesNotImplyAttractor',
  'doesNotImplyRegimeChange',
]) assert.ok(phenomena.includes(token),`distributed_phenomenon_boundary_missing:${token}`);

for(const token of [
  'SFI-SCIENTIFIC-METHOD-RUNTIME-1.0',
  "family:'CHANGE_POINT'",
  "family:'SURVIVAL_SOJOURN'",
  "family:'MARKOV_SEMI_MARKOV'",
  "family:'STATE_SPACE'",
  "family:'POINT_PROCESS'",
  "family:'DYNAMICAL_SYSTEMS'",
  "family:'NETWORK_SCIENCE'",
  "family:'ACTIVE_LEARNING'",
  "status:'ABSTAINED'",
  "epistemicClass:'derived'",
  'does not establish a regime change',
]) assert.ok(scientificRuntime.includes(token),`scientific_runtime_contract_missing:${token}`);

for(const token of [
  'PERSISTED_EVIDENCE_IDS_REQUIRED_BEFORE_EXECUTION',
  'persistMethodLabExperimentPreregistration',
  'persistMethodLabExperimentRun',
  "basis: 'PHENOMENON_CONDITION'",
  "status:'PENDING_RETURN'",
  'runMethodLabSimulation',
  "epistemicClass:'SIMULATED'",
  'materialPerturbationExecuted:false',
  'canonicalMutation:false',
]) assert.ok(dispatch.includes(token),`scientific_dispatch_boundary_missing:${token}`);

for(const token of [
  'SFI-ACTIVE-OBSERVATION-REQUEST-1.0',
  "epistemicClass:'proposed'",
  'noCalendarTimeoutInvented:true',
  'acquisitionPerformed:false',
  'materialPerturbation:false',
]) assert.ok(activeObservation.includes(token),`active_observation_boundary_missing:${token}`);

for(const token of [
  'SFI-PERTURBATION-REVIEW-CANDIDATE-1.0',
  'authorityRequired:true',
  "decisionOwner:'ROOT'",
  'executionPerformed:false',
  'safeOperatingLimitClaim:false',
]) assert.ok(perturbation.includes(token),`perturbation_review_boundary_missing:${token}`);

for(const token of [
  'SFI-JR-RETURN-RECONCILIATION-1.0',
  'MECHANICALLY_MATCHED_POST_T0_FIELD_EPOCH',
  'verifiedEvidenceRefs',
  "comparisonStatus:'RETURN_AVAILABLE_NOT_RESULT_VALIDATION'",
  "resultValidation:'NOT_ESTABLISHED_BY_MEASURE_PRESENCE_ALONE'",
]) assert.ok(returnReconciliation.includes(token),`return_reconciliation_boundary_missing:${token}`);

for(const token of [
  "'PHENOMENON_CONDITION'",
  "basis?: 'CHRONOLOGY' | 'PHENOMENON_CONDITION'",
  "condition?: string | null",
  'METHOD_LAB_EXPERIMENT_RETURN_WINDOW_CLOSE_REQUIRED',
]) assert.ok(experimentContract.includes(token),`method_lab_phenomenon_return_contract_missing:${token}`);

for(const token of [
  "deterministicAnalysisId(kind: 'preregistration'|'run'|'return'",
  'readInstitutionalMethodLabExperimentPreregistration',
  'persistInstitutionalMethodLabRealityReturn',
  'recordInstitutionalMethodLabContrastLearningCandidate',
]) assert.ok(experimentPersistence.includes(token),`method_lab_institutional_persistence_missing:${token}`);

assert.ok(methodReadModel.includes('methodLabPreregistrationId(experimentId)'), 'learning_state_must_resolve_canonical_method_lab_uuid');

for(const token of [
  "graph.sourceState === 'observed' && graph.readPlane === 'SUPABASE'",
  'persistFieldTemporalEpoch',
  'persistDistributedPhenomenonCandidate',
  'executeScientificMethodsForNode',
  'persistActiveObservationRequest',
  'persistPerturbationReviewCandidate',
  'dispatchScientificMethodToLab',
  'reconcileJrMethodLabReturns',
  "decision === 'REVIEW_PERTURBATION_CANDIDATE'",
  'materialPerturbationExecuted:false',
  'canonicalMutation:false',
  'returnFabricated:false',
]) assert.ok(jr.includes(token),`jr_field_cycle_boundary_missing:${token}`);

assert.ok(world.includes('runJrFieldCycle'), 'world_mcp_must_continue_into_jr');
assert.ok(cron.includes('runJrFieldCycle'), 'world_cron_must_continue_into_jr');
assert.ok(root.includes('projectDistributedPhenomenaForRoot'), 'root_must_project_distributed_phenomena');
assert.ok(root.includes('readFieldEpochHistories'), 'root_must_hydrate_persisted_field_epochs');
assert.ok(root.includes('fieldHistory: fieldHistorySummaries.get(node.nodeId)'), 'root_must_bind_epoch_history_to_field_node');
assert.ok(rootView.includes('PERSISTED EPOCHS'), 'root_hub_must_expose_persisted_epoch_count');
assert.ok(rootView.includes('FIELD HISTORY'), 'root_hub_must_expose_recent_field_history');
assert.ok(rootView.includes("closesAt: string | null"), 'root_method_result_must_support_phenomenon_conditioned_return');

assert.equal(/runGovernedExecutionRouter|transitionOperationalCase|governanceDecision/.test(jr),false,'jr_must_not_execute_governed_or_material_actions');
assert.equal(/\.from\('graph_nodes'\).*insert|\.from\('graph_edges'\).*insert/.test(jr),false,'jr_must_not_mutate_canonical_graph_store_directly');
assert.equal(/materialPerturbationExecuted:true|executionPerformed:true/.test(jr+perturbation+activeObservation),false,'jr_must_not_claim_material_execution');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-JR-FIELD-CYCLE-QA-1.1',
  appendOnlyTemporalEpochs:true,
  distributedPhenomenonCandidate:true,
  boundedScientificRuntime:true,
  formalMethodLabPreregistration:true,
  phenomenonConditionedReturn:true,
  activeObservationRequest:true,
  perturbationRequiresRootReview:true,
  mechanicalReturnMatchOnly:true,
  learningReentersRoot:true,
  materialPerturbationExecution:false,
  canonicalMutation:false,
  fabricatedReturn:false,
  rootSingleFieldProjection:true,
  worldContinuation:true,
},null,2));
