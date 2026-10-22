import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluatePossibility, compareRivalConditions, type PossibilityInput } from './hypothesisConditionalExplore';
import type { HypothesisConditionalBranch } from './hypothesisConditionalBranches';
import { deriveAdaptiveTrajectoryPlan } from '@/lib/scorefriction/regimeWatch';
import type { OperationalCycleState } from '@/lib/scorefriction/contracts/operationalCycle';

const branch: HypothesisConditionalBranch = {
  id:'hyp-1:SUPPORT_IF:C1', relation:'SUPPORT_IF', criterionId:'C1',
  signal:'systemicFriction', metric:null, operator:'GT', threshold:0.7, unit:null,
  required:true, minimumObservations:5, sourceFamilies:[],
  epistemicClass:'CONDITIONAL_NOT_OBSERVED',
  contextRule:'Frozen original validation window only.',
  verificationState:'NOT_EVALUATED_HERE',
};
assert.throws(() => compareRivalConditions({ electedAttractor: '' } as any), /ELECTED_ATTRACTOR_REQUIRED/);

const sample: PossibilityInput = {
  value:'0.75', presence:'UNKNOWN', observations:'5', evidence:'10', sourceFamilies:'1',
};


test('rival wins a criterion but attractor remains a conditional destination', () => {
 const r=compareRivalConditions({
   primary:branch,rival:{...branch,id:'R',operator:'LT',threshold:0.4},
   primaryScenario:{...sample,value:'0.2'},rivalScenario:{...sample,value:'0.2'},
   primaryWindowRef:'same',rivalWindowRef:'same',minimumEvidence:5,minimumSourceFamilies:1,
   electedAttractor:'Chosen',recovery:{action:'Bounded move',condition:'If possible',expectedWorldSignal:'Return',reversible:true}
 });
 assert.equal(r.comparison.advantage,'RIVAL_CONDITION_ADVANTAGE');
 assert.equal(r.recovery.possibleDespitePrimaryLoss,true);
 assert.equal(r.recovery.destinationVerified,false);
 assert.equal(r.returns.world.state,'NOT_VERIFIED');
});


test('separate reported and world returns require a frozen before-action prediction',()=>{
 const base={primary:branch,rival:branch,primaryScenario:sample,rivalScenario:sample,
  primaryWindowRef:'same',rivalWindowRef:'same',minimumEvidence:5,minimumSourceFamilies:1,electedAttractor:'Chosen',
  participantReturn:{claimedAction:'I acted',evidenceRefs:['claim:1']},
  worldReturn:{observedAt:'2026-10-21T12:00:00Z',evidenceRefs:['world:1'],independentlyVerified:true,
   predictedSignalMatched:'YES' as const,attractorObserved:'YES' as const}};
 const reported=compareRivalConditions(base);
 assert.equal(reported.returns.participant.state,'USER_REPORTED');
 assert.equal(reported.returns.world.state,'NOT_VERIFIED');
 const confirmed=compareRivalConditions({...base,sealedPrediction:{
  hash:'sha256:registered',frozenAt:'2026-10-18T12:00:00Z',actionAt:'2026-10-19T12:00:00Z'}});
 assert.equal(confirmed.returns.world.state,'REQUIRES_SOURCE_VERIFICATION');
 assert.equal(confirmed.recovery.destinationVerified,false);
 assert.equal(confirmed.learning.promoted,false);
});

test('the original frozen branch is never mutated', () => {
  const before = JSON.stringify(branch);
  evaluatePossibility(branch,10,1,sample);
  assert.equal(JSON.stringify(branch),before);
});
test('an empty hypothetical value is unknown rather than zero', () => {
  assert.equal(evaluatePossibility(branch,10,1,{...sample,value:''}).state,'VALUE_UNSPECIFIED');
  assert.equal(evaluatePossibility(branch,10,1,{...sample,value:'Infinity'}).state,'VALUE_UNSPECIFIED');
});
test('a counterexample changes only the criterion, not the canonical outcome', () => {
  const result=evaluatePossibility(branch,10,1,{...sample,value:'0.6'});
  assert.equal(result.state,'CRITERION_NOT_MET');
  assert.equal(result.matchesCriterion,false);
});
test('a matching signal with inadequate evidence remains insufficient', () => {
  const result=evaluatePossibility(branch,10,1,{...sample,evidence:'0'});
  assert.equal(result.state,'SAMPLING_INSUFFICIENT');
  assert.ok(result.missing.some(x=>x.includes('Evidencia')));
});
test('qualified hypothetical numbers never get labeled observed', () => {
  const result=evaluatePossibility(branch,10,1,sample);
  assert.equal(result.state,'CONDITION_POSSIBLE_IN_SCENARIO');
  assert.match(result.boundary,/No verifica/);
});
test('declared source families require provenance verification even with sufficient counts', () => {
  const result=evaluatePossibility({...branch,sourceFamilies:['technology_discourse']},10,1,sample);
  assert.equal(result.state,'PROVENANCE_UNVERIFIED');
  assert.ok(result.missing.some(x=>x.includes('technology_discourse')));
});
test('presence and absence criteria are evaluated without synthetic numeric measurement', () => {
  const presence={...branch,operator:'PRESENCE' as const,threshold:null};
  assert.equal(evaluatePossibility(presence,10,1,{...sample,value:'',presence:'PRESENT'}).state,'CONDITION_POSSIBLE_IN_SCENARIO');
  assert.equal(evaluatePossibility(presence,10,1,{...sample,presence:'ABSENT'}).state,'CRITERION_NOT_MET');
});
test('a fractional observation count cannot meet the observation minimum', () => {
  assert.equal(evaluatePossibility(branch,10,1,{...sample,observations:'5.5'}).state,'SAMPLING_INSUFFICIENT');
});


const adaptiveBaseline = {
  case_id:'CASE-OBSERVED-1',
  object_presence:'provided',
  evidence:[{ id:'persisted-evidence-1' }],
  technical_state:{worldspect_ok:true,scorefriction_ok:true,supabase_ok:true,fallback_used:false,warnings:[]},
  degradation:{level:0.64,trend:'rising',notes:[]},
  regime:{changed:true,previous:'stable',vector:'tension',world:'tension'},
  direction:{current:'stable',projected:'rising',confidence:0.7},
  weak_signals:[{vector:'tech',persistence:0.3,trust:0.4}],
  recommended_experiments:[{
    id:'TEST-1',status:'ready_for_test',action:'Perform a single bounded internal test',
    expected_effect:'A later-world source records a comparable directional change',
    verification_window:'72h',failure_condition:'Documented breach of declared limits',
    evidence_required:['source','timestamp','before/after'],
  }],
} as unknown as OperationalCycleState;
const adaptiveInput = {
  state:adaptiveBaseline,electedAttractor:'Chosen target unchanged',
  hypothesisPrimary:'H1: bounded action can influence direction',
  hypothesisRival:'H2: direction changes from external factors',
};

test('adaptive reconfiguration can stage a bounded route after a measured regime drift',()=>{
  const plan=deriveAdaptiveTrajectoryPlan(adaptiveInput);
  assert.equal(plan.selectedRouteId,'RECONFIGURE');
  assert.equal(plan.state,'PROPOSABLE_GOVERNED_RECONFIGURATION');
  assert.equal(plan.electedAttractor,adaptiveInput.electedAttractor);
  assert.equal(plan.canCreateDraftProposal,true);
  assert.equal(plan.execution.automaticExternalExecution,false);
  assert.equal(plan.execution.learningPromoted,false);
  assert.equal(plan.routes.find(x=>x.id==='RECONFIGURE')?.expectedDisplacement,null);
});
test('a lone weak signal opens prospective testing without claiming a rival victory',()=>{
  const state={...adaptiveBaseline,degradation:{level:0.3,trend:'stable',notes:[]},
    regime:{changed:false,previous:'stable',vector:'stable',world:'stable'},
    direction:{current:'stable',projected:'stable',confidence:0.6}} as OperationalCycleState;
  const plan=deriveAdaptiveTrajectoryPlan({...adaptiveInput,state});
  assert.equal(plan.selectedRouteId,'BOUNDED_TEST');
  assert.equal(plan.hypothesis.status,'CANDIDATE_NOT_OBSERVED_OR_VERIFIED');
  assert.equal(plan.observation.previousWorldReturnVerified,false);
});
test('no client-only evidence, no object, degraded world or missing attractor may create a draft',()=>{
  const scenarios=[
    {...adaptiveInput,state:{...adaptiveBaseline,evidence:[]} as OperationalCycleState},
    {...adaptiveInput,state:{...adaptiveBaseline,object_presence:'missing'} as OperationalCycleState},
    {...adaptiveInput,state:{...adaptiveBaseline,technical_state:{...adaptiveBaseline.technical_state,fallback_used:true}} as OperationalCycleState},
    {...adaptiveInput,electedAttractor:''},
  ];
  for(const scenario of scenarios){
    const plan=deriveAdaptiveTrajectoryPlan(scenario);
    assert.equal(plan.canCreateDraftProposal,false);
    assert.equal(plan.selectedRouteId,'OBSERVE');
    assert.equal(plan.execution.automaticExternalExecution,false);
  }
});
test('a regime warning without viable bounded experiment only asks for evidence',()=>{
  const plan=deriveAdaptiveTrajectoryPlan({...adaptiveInput,
    state:{...adaptiveBaseline,recommended_experiments:[{...adaptiveBaseline.recommended_experiments![0],status:'watch_only'}]} as OperationalCycleState});
  assert.equal(plan.selectedRouteId,'OBSERVE');
  assert.equal(plan.canCreateDraftProposal,false);
});

test('adaptive proposal goes through authenticated ROOT, idempotent draft and existing governance queue',()=>{
 const route=readFileSync('src/app/api/scorefriction/regime-watch/route.ts','utf8');
 assert.match(route,/body\?\.operation === 'adaptive_plan'/);
 assert.match(route,/requireRootActor\('scorefriction\.adaptive\.plan'\)/);
 assert.match(route,/if \(body\.commitDraft !== true\)/);
 assert.match(route,/!plan\.canCreateDraftProposal/);
 assert.match(route,/proposalType:'trajectory_reconfiguration'/);
 assert.match(route,/createActionProposal\(/);
 assert.match(route,/hasVerifiedLatestUniversalReturnCalibration\(history\.events\)/);
 assert.match(route,/PRIOR_CYCLE_CASE_OR_TENANT_MISMATCH/);
 assert.match(route,/approvalRequired:true/);
 assert.match(route,/auditRootAction\(/);
 assert.match(route,/worldReturnVerified:false/);
 assert.equal(route.includes('executeAuthorizedSfiAction'),false);
 const enterprise=readFileSync('src/components/sfi/RealityChainWorkbench.tsx','utf8');
 assert.equal(enterprise.includes('deriveAdaptiveTrajectoryPlan'),false);
 assert.equal(enterprise.includes('trajectory_reconfiguration'),false);
});

test('a case-linked independently calibrated contradiction triggers a prospective replan',()=>{
 const stable={...adaptiveBaseline,
   regime:{changed:false,previous:'stable',world:'stable',vector:'stable'},
   direction:{current:'stable',projected:'stable',confidence:0.8},
   degradation:{level:0.25,trend:'stable',notes:[]}} as OperationalCycleState;
 const verifiedPreviousReturn={classification:'CONTRADICTED' as const,
   eventId:'registered-contrast-1',evidenceRefs:['world:observed:1']};
 const replan=deriveAdaptiveTrajectoryPlan({...adaptiveInput,state:stable,verifiedPreviousReturn});
 assert.equal(replan.observation.previousWorldReturnVerified,true);
 assert.equal(replan.selectedRouteId,'RECONFIGURE');
 assert.equal(replan.execution.automaticExternalExecution,false);
 const confirmed=deriveAdaptiveTrajectoryPlan({...adaptiveInput,state:stable,
   verifiedPreviousReturn:{...verifiedPreviousReturn,classification:'CONFIRMED'}});
 assert.equal(confirmed.selectedRouteId,'OBSERVE','do not automatically repeat a successful route');
 const unverified=deriveAdaptiveTrajectoryPlan({...adaptiveInput,state:stable,
   verifiedPreviousReturn:{...verifiedPreviousReturn,evidenceRefs:[]}});
 assert.equal(unverified.observation.previousWorldReturnVerified,false);
 assert.equal(unverified.selectedRouteId,'BOUNDED_TEST');
});

test('publishing or deploying is never a reversible internal adaptive route',()=>{
 for(const materialAction of ['Publicar una pieza de prueba del objeto', 'Deploy to production', 'Enviar correo a terceros']){
  const state={...adaptiveBaseline,recommended_experiments:[{
    ...adaptiveBaseline.recommended_experiments![0],action:materialAction,
  }]} as OperationalCycleState;
  const plan=deriveAdaptiveTrajectoryPlan({...adaptiveInput,state});
  assert.equal(plan.canCreateDraftProposal,false);
  assert.equal(plan.selectedRouteId,'OBSERVE');
  assert.equal(plan.observation.proposedMaterialAction,true);
  assert(plan.blockers.includes('EXTERNAL_OR_MATERIAL_ACTION_REQUIRES_SEPARATE_EXECUTION_AUTHORITY'));
  assert.equal(plan.routes.find(x=>x.id==='RECONFIGURE')?.reversibility,'UNASSESSED');
  assert.equal(plan.routes.find(x=>x.id==='BOUNDED_TEST')?.reversibility,'UNASSESSED');
 }
});

test('governed adaptive drafts need a live Case and a persisted elected-attractor reference',()=>{
 const withoutAttractor=deriveAdaptiveTrajectoryPlan({...adaptiveInput,
   casePreconditions:{lifecycleEligible:true,declaredAttractorPresent:false}});
 assert.equal(withoutAttractor.canCreateDraftProposal,false);
 assert.equal(withoutAttractor.selectedRouteId,'OBSERVE');
 assert(withoutAttractor.blockers.includes('PERSISTED_ELECTED_ATTRACTOR_REQUIRED'));
 const closed=deriveAdaptiveTrajectoryPlan({...adaptiveInput,
   casePreconditions:{lifecycleEligible:false,declaredAttractorPresent:true}});
 assert.equal(closed.canCreateDraftProposal,false);
 assert(closed.blockers.includes('CASE_NOT_OPEN_FOR_GOVERNED_PLANNING'));
 const eligible=deriveAdaptiveTrajectoryPlan({...adaptiveInput,
   casePreconditions:{lifecycleEligible:true,declaredAttractorPresent:true}});
 assert.equal(eligible.canCreateDraftProposal,true);
 assert.equal(eligible.execution.automaticExternalExecution,false);
});

test('adaptive Case evidence gate never upgrades source, hypothesis or ScoreFriction observation to accepted evidence',()=>{
 const route=readFileSync('src/app/api/scorefriction/regime-watch/route.ts','utf8');
 assert.match(route,/readOperationalCase\(caseId,gate\.ctx\.user\.id\)/);
 assert.match(route,/CASE_NOT_ACCESSIBLE_OR_NOT_FOUND/);
 assert.match(route,/object\.kind==='EVIDENCE' && object\.epistemicRole==='EVIDENCE'/);
 assert.match(route,/object\.sourceRefs\.length>0 \|\| object\.recordRefs\.length>0/);
 assert.match(route,/state\.evidence=admittedEvidence\.map/);
 assert.match(route,/PERSISTED_ELECTED_ATTRACTOR_REQUIRED|hasDeclaredAttractor/);
 assert.match(route,/nonAdmittedScoreFrictionObservationCount/);
 assert.match(route,/declared\.trim\(\)===chosenAttractor/);
});
