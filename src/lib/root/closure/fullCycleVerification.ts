import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';
import { runStudioMasterAnalysisLoop } from '@/lib/studio/cognitive/studioMasterAnalysisLoop';
import { runIntegratedInstitutionalCycle } from '@/core/cognitive-twin/integratedInstitutionalCycle';
import { recordCognitiveTwinExperience } from '@/core/cognitive-twin/experience';
import { readInstitutionalReadiness } from './readInstitutionalReadiness';

type Row = Record<string, unknown>;
type Step = { id:string; label:string; status:'PASS'|'BLOCKED'; required:boolean; ref:string|null; detail:string };
function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : ''; }

/**
 * Observed Field RETURN admission for the existing full-cycle verifier.
 * A pending return, unmatched intervention, missing T1 or unaccepted evidence
 * is not a completed empirical response, even when a SQL row exists.
 */
export function hasObservedFieldReturn(fieldCase:Row|null, fieldReturn:Row|null, fieldOutcome:Row|null, intervention:Row|null){
  if(!fieldCase||!fieldReturn||!fieldOutcome||!intervention)return false;
  const caseId=text(fieldCase.id);
  const interventionId=text(intervention.id);
  const returnAt=Date.parse(text(fieldReturn.returned_at));
  const expectedAt=Date.parse(text(fieldReturn.expected_at));
  const outcomeRecordedAt=Date.parse(text(fieldOutcome.recorded_at));
  const evidenceRefs=Array.isArray(fieldReturn.evidence_ids)?fieldReturn.evidence_ids.map(text).filter(Boolean):[];
  const outcomeRefs=Array.isArray(fieldOutcome.evidence_ids)?fieldOutcome.evidence_ids.map(text).filter(Boolean):[];
  return Boolean(caseId&&interventionId
    && fieldCase.consent===true
    && !fieldCase.deleted_at
    && ['CLOSED_OBSERVED','CLOSED_VERIFIED'].includes(text(fieldCase.status))
    && text(fieldReturn.status)==='RETURN_ACCEPTED'
    && text(intervention.status)==='EXECUTION_RECORDED'
    && text(fieldReturn.case_id)===caseId
    && text(fieldOutcome.case_id)===caseId
    && text(intervention.case_id)===caseId
    && text(fieldReturn.intervention_id)===interventionId
    && text(fieldOutcome.intervention_id)===interventionId
    && Number.isFinite(returnAt)&&Number.isFinite(expectedAt)&&Number.isFinite(outcomeRecordedAt)
    && returnAt>=expectedAt
    && outcomeRecordedAt>=returnAt
    && evidenceRefs.some(ref=>outcomeRefs.includes(ref))
    && text(fieldOutcome.actual)
    && text(fieldOutcome.expected)
  );
}


export async function runFullCycleVerification(input:{ ownerId:string; operatingCycleId:string }) {
  const db=createServiceSupabaseClient();
  const startedAt=new Date().toISOString();
  const steps:Step[]=[];

  const operating=await db.from('sfi_operating_cycles').select('*').eq('id',input.operatingCycleId).eq('owner_id',input.ownerId).maybeSingle();
  if(operating.error||!operating.data) throw new Error(`OPERATING_CYCLE_NOT_FOUND:${operating.error?.message??'missing'}`);

  // 1. Real ROOT evidence with a recoverable epistemic event. No row is fabricated.
  const evidenceRows=await db.from('root_evidence_entries')
    .select('id,title,epistemic_event_id,created_at').not('epistemic_event_id','is',null)
    .order('created_at',{ascending:false}).limit(50);
  let evidence:Row|null=null;
  let event:Row|null=null;
  for(const candidate of (evidenceRows.data??[]) as Row[]){
    const eventId=text(candidate.epistemic_event_id);if(!eventId)continue;
    const found=await db.from('epistemic_events').select('id,event_id,event_name,epistemic_class,occurred_at').eq('event_id',eventId).maybeSingle();
    if(found.data){evidence=candidate;event=found.data as Row;break;}
  }
  if(evidence&&event) steps.push({id:'evidence',label:'Evidencia + procedencia',status:'PASS',required:true,ref:text(evidence.id),detail:`${text(evidence.title)||'Evidencia'} ↔ ${text(event.event_id)}`});
  else steps.push({id:'evidence',label:'Evidencia + procedencia',status:'BLOCKED',required:true,ref:null,detail:'No existe evidencia ROOT reciente cuyo evento epistemológico pueda recuperarse por event_id.'});

  // 2. Studio is a real optional specialized branch. It can enrich a proof, but core SFI closure
  // does not depend on the existence of an Edwing/Studio object.
  let studioRef:string|null=null;
  const studioRows=await db.from('studio_objects').select('id,title,owner_id,created_at').eq('owner_id',input.ownerId).order('created_at',{ascending:false}).limit(30);
  let studioResult:any=null;
  if(studioRows.data?.length){
    for(const candidate of studioRows.data as Row[]){
      try{
        const result=await runStudioMasterAnalysisLoop({ownerId:input.ownerId,objectId:text(candidate.id)});
        if(result.ok){studioResult=result;studioRef=text(candidate.id);break;}
        if(!studioResult)studioResult=result;
      }catch(error){if(!studioResult)studioResult={ok:false,error:error instanceof Error?error.message:String(error)};}
    }
  }
  if(studioResult?.ok&&studioRef) steps.push({id:'studio',label:'Studio · rama opcional',status:'PASS',required:false,ref:studioRef,detail:`${studioResult.passCount} pases · ${studioResult.convergence}`});
  else steps.push({id:'studio',label:'Studio · rama opcional',status:'BLOCKED',required:false,ref:null,detail:text(studioResult?.error)||'Sin objeto Studio ejecutable. Esto no bloquea el ciclo institucional núcleo.'});

  // 3. Method Lab executes only if the real evidence/provenance gate passed.
  let labResult:any=null;
  if(evidence){
    try{labResult=await runMethodLabSimulation({protocolId:'sociotechnical_simulation',evidenceIds:[text(evidence.id)],actorId:input.ownerId,parameters:{verificationMode:'REAL_EVIDENCE_REPLAY',sourceOperatingCycleId:input.operatingCycleId}});}catch(error){labResult={ok:false,error:error instanceof Error?error.message:String(error)};}
  }
  if(labResult?.ok) steps.push({id:'method_lab',label:'Method Lab',status:'PASS',required:true,ref:text(labResult.labAnalysisId),detail:`SIMULATED · ${text(labResult.run?.resultHash).slice(0,16)}…`});
  else steps.push({id:'method_lab',label:'Method Lab',status:'BLOCKED',required:true,ref:null,detail:text(labResult?.error)||'La prueba de laboratorio no pudo ejecutarse sobre evidencia persistida.'});

  // 4. Field is verified against an actual already-returned case. We do not synthesize a return
  // or bypass its temporal window just to make this QA green.
  // The schema has recorded_at, not created_at. A wrong sort used to fail the
  // query and silently hide valid Field outcomes from the institutional proof.
  const latestOutcome=await db.from('field_outcomes').select('*').eq('owner_id',input.ownerId).order('recorded_at',{ascending:false}).limit(1).maybeSingle();
  let fieldCase:Row|null=null;let fieldReturn:Row|null=null;let intervention:Row|null=null;
  if(latestOutcome.data){
    const candidate=latestOutcome.data as Row;
    const caseId=text(candidate.case_id);
    const interventionId=text(candidate.intervention_id);
    const [caseRow,returnRow,interventionRow]=await Promise.all([
      db.from('field_cases').select('*').eq('id',caseId).eq('owner_id',input.ownerId).maybeSingle(),
      db.from('field_returns').select('*').eq('case_id',caseId).eq('intervention_id',interventionId).eq('owner_id',input.ownerId).order('returned_at',{ascending:false}).limit(1).maybeSingle(),
      db.from('field_interventions').select('*').eq('id',interventionId).eq('case_id',caseId).eq('owner_id',input.ownerId).maybeSingle(),
    ]);
    fieldCase=caseRow.data as Row|null;fieldReturn=returnRow.data as Row|null;intervention=interventionRow.data as Row|null;
  }
  const fieldOutcome=latestOutcome.data as Row|null;
  const fieldComplete=latestOutcome.error===null&&hasObservedFieldReturn(fieldCase,fieldReturn,fieldOutcome,intervention);
  if(fieldComplete) steps.push({id:'field',label:'Field + retorno',status:'PASS',required:true,ref:text(fieldCase?.id),detail:`Retorno ${text(fieldReturn?.status)} · outcome ${text(fieldOutcome?.id).slice(0,12)}… · ${fieldOutcome?.verified===true?'VERIFIED':'OBSERVED_NOT_INDEPENDENTLY_VERIFIED'}`});
  else steps.push({id:'field',label:'Field + retorno',status:'BLOCKED',required:true,ref:null,detail:latestOutcome.error?.message??'Field requires a consented case, matching EXECUTION_RECORDED intervention, accepted time-valid T1 RETURN, shared evidence reference and corresponding outcome; pending/unverified returns do not certify a full cycle.'});

  // 5. Preserve the verification replay as candidate memory, not as new observed reality.
  const proofKey=`SFI:FULL_CYCLE_VERIFICATION:${input.operatingCycleId}:${startedAt}`;
  const twin=await recordCognitiveTwinExperience({
    memoryKey:proofKey,memoryType:'STATE',sourceKind:'sfi_operating_cycles',sourceRef:input.operatingCycleId,createdBy:input.ownerId,
    evidenceRefs:evidence?[text(evidence.id)]:[],
    content:{epistemicClass:'VERIFICATION_REPLAY',startedAt,studioObjectId:studioRef,fieldCaseId:text(fieldCase?.id)||null,fieldOutcomeId:text(fieldOutcome?.id)||null,methodLabId:text(labResult?.labAnalysisId)||null,rule:'This record proves only that existing real persisted material was replayed through executable SFI organs. It is not a new observation, intervention outcome, scientific validation or canonical promotion.'},
  });
  if(twin.ok) steps.push({id:'cognitive_twin',label:'Cognitive Twin',status:'PASS',required:true,ref:text(twin.memory?.id),detail:'Replay persistido como experiencia candidata; no promovido.'});
  else steps.push({id:'cognitive_twin',label:'Cognitive Twin',status:'BLOCKED',required:true,ref:null,detail:text((twin as any).reason)||'No se pudo persistir la experiencia de verificación.'});

  // 6. Execute the actual integrated institutional cycle. It now refuses false CLOSED states.
  let institutional:any=null;
  try{institutional=await runIntegratedInstitutionalCycle(`full-cycle-verification:${input.operatingCycleId}`);}catch(error){institutional={ok:false,error:error instanceof Error?error.message:String(error)};}
  if(institutional?.ok) steps.push({id:'institutional_cycle',label:'Ciclo institucional',status:'PASS',required:true,ref:text(institutional.run?.id)||text(institutional.taskId),detail:`${institutional.agentCount??0} agentes · CT conectado=${String(institutional.cognitiveTwinIntegration?.connected)}`});
  else steps.push({id:'institutional_cycle',label:'Ciclo institucional',status:'BLOCKED',required:true,ref:text(institutional?.run?.id)||null,detail:text(institutional?.error)||arraysToText(institutional?.warnings)||text(institutional?.status)||'El ciclo institucional quedó degradado.'});

  // 7. Final runtime gate. READY-empty is acceptable; broken dependencies are not.
  let readiness:any=null;
  try{readiness=await readInstitutionalReadiness();}catch(error){readiness={runtimeOperational:false,error:error instanceof Error?error.message:String(error)};}
  if(readiness?.runtimeOperational) steps.push({id:'readiness',label:'Readiness',status:'PASS',required:true,ref:null,detail:'Todos los órganos núcleo están OPERATIONAL o READY.'});
  else steps.push({id:'readiness',label:'Readiness',status:'BLOCKED',required:true,ref:null,detail:text(readiness?.error)||`${readiness?.blockers?.length??0} blocker(s) internos.`});

  const complete=steps.filter(step=>step.required).every(step=>step.status==='PASS');
  const finishedAt=new Date().toISOString();
  const proof={contract:'SFI-FULL-CYCLE-PROOF-1.1',mode:'REAL_PERSISTED_EVIDENCE_REPLAY',startedAt,finishedAt,complete,steps,boundary:'No mocks, synthetic outcomes or hardcoded scientific observations are used. Field return is never fabricated or temporally bypassed. Studio is an optional specialized branch; missing Studio material cannot manufacture failure of the institutional core. Any failed required dependency remains BLOCKED.'};

  const currentMeta=rec(operating.data.metadata);
  const update=await db.from('sfi_operating_cycles').update({
    status:complete?'CLOSED':'BLOCKED',
    evidence_refs:Array.from(new Set([...(Array.isArray(operating.data.evidence_refs)?operating.data.evidence_refs:[]),...(evidence?[text(evidence.id)]:[])])),
    studio_object_refs:Array.from(new Set([...(Array.isArray(operating.data.studio_object_refs)?operating.data.studio_object_refs:[]),...(studioRef?[studioRef]:[])])),
    method_lab_refs:Array.from(new Set([...(Array.isArray(operating.data.method_lab_refs)?operating.data.method_lab_refs:[]),...(labResult?.labAnalysisId?[text(labResult.labAnalysisId)]:[])])),
    field_case_ref:text(fieldCase?.id)||operating.data.field_case_ref||null,
    return_refs:Array.from(new Set([...(Array.isArray(operating.data.return_refs)?operating.data.return_refs:[]),...(fieldReturn?[text(fieldReturn.id)]:[])])),
    cognitive_twin_refs:Array.from(new Set([...(Array.isArray(operating.data.cognitive_twin_refs)?operating.data.cognitive_twin_refs:[]),...(twin.ok&&twin.memory?.id?[text(twin.memory.id)]:[])])),
    metadata:{...currentMeta,fullCycleProof:proof},updated_at:finishedAt,closed_at:complete?finishedAt:null,
  }).eq('id',input.operatingCycleId).eq('owner_id',input.ownerId).select('*').single();
  if(update.error) throw new Error(`FULL_CYCLE_PROOF_PERSIST_FAILED:${update.error.message}`);

  return {ok:complete,proof,cycle:update.data,readiness};
}

function arraysToText(value:unknown){return Array.isArray(value)?value.map(String).slice(0,4).join(' · '):'';}
