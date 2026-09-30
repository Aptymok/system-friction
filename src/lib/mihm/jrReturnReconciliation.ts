import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  assertMethodLabExperimentRun,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from '@/lib/method-lab/experimentContract';
import {
  methodLabReturnId,
  persistInstitutionalMethodLabRealityReturn,
  readInstitutionalMethodLabExperimentPreregistration,
  recordInstitutionalMethodLabContrastLearningCandidate,
} from '@/lib/method-lab/experimentPersistence';
import { SFI_SUPABASE_READ_BUDGET } from '@/lib/supabase/readBudget';

export const SFI_JR_RETURN_RECONCILIATION_CONTRACT = 'SFI-JR-RETURN-RECONCILIATION-1.0' as const;

type Row = Record<string, unknown>;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function row(value:unknown):Row {
  return value && typeof value==='object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value:unknown):Row[] {
  return Array.isArray(value) ? value.filter((item):item is Row=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item)) : [];
}
function strings(value:unknown) {
  return Array.isArray(value) ? value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map((item)=>item.trim()) : [];
}
function unique(values:string[]) {
  return [...new Set(values.map(value=>value.trim()).filter(Boolean))];
}

function observedMeasures(snapshot:Row) {
  const measures:string[]=[];
  for(const relation of rows(snapshot.relationTransitions)){
    if(Number.isFinite(Number(relation.weightDelta))) measures.push('RELATION_WEIGHT_CHANGE');
    const previous=typeof relation.previousState==='string'?relation.previousState:null;
    const current=typeof relation.currentState==='string'?relation.currentState:null;
    if(previous&&current&&previous!==current) measures.push('RELATION_STATE_CHANGE');
  }
  for(const coordinate of rows(snapshot.temporalCoordinates)){
    if(coordinate.basis==='RECURRENCE') measures.push('RECURRENCE');
    if(coordinate.basis==='STATE_OCCUPANCY') measures.push('STATE_OCCUPANCY');
  }
  const emergence=row(snapshot.emergence);
  if(emergence.state==='OBSERVED_EMERGENCE') measures.push('EMERGENCE');
  const capacity=row(snapshot.capacity);
  if(Object.keys(capacity).length && strings(capacity.evidenceRefs).length) measures.push('CAPACITY_RESPONSE');
  return unique(measures);
}

function epochCandidateRefs(event:Row,snapshot:Row) {
  return unique([
    ...strings(event.lineage),
    ...strings(snapshot.evidenceRefs),
    ...strings(snapshot.sourceObservationRefs),
  ]).filter((ref)=>UUID_RE.test(ref));
}

async function verifiedEvidenceRefs(refs:string[]) {
  const requested=unique(refs).slice(0,SFI_SUPABASE_READ_BUDGET.evidenceRefs);
  if(!requested.length)return [];
  const db=createServiceSupabaseClient();
  const [rootEvidence,ledgerEvidence]=await Promise.all([
    db.from('root_evidence_entries').select('id').in('id',requested),
    db.from('sfi_evidence_ledger').select('id').in('id',requested),
  ]);
  if(rootEvidence.error||ledgerEvidence.error)return [];
  return unique([
    ...(rootEvidence.data??[]).map(item=>String(item.id)),
    ...(ledgerEvidence.data??[]).map(item=>String(item.id)),
  ]);
}

export async function reconcileJrMethodLabReturns(input:{
  actorId:string;
  tenantId?:string;
  maxRuns?:number;
}) {
  const db=createServiceSupabaseClient();
  const maxRuns=Math.max(1,Math.min(SFI_SUPABASE_READ_BUDGET.jrReturnRuns,input.maxRuns??SFI_SUPABASE_READ_BUDGET.jrReturnRuns));
  const runsResult=await db.from('sfi_lab_analyses')
    .select('id,source,mode,raw_analysis,created_at')
    .is('owner_id',null)
    .like('mode','experiment_run:%')
    .order('created_at',{ascending:false})
    .limit(maxRuns);
  if(runsResult.error) throw new Error(`JR_RETURN_RUN_READ_FAILED:${runsResult.error.message}`);

  const pending:Array<{
    runRef:string;
    run:MethodLabExperimentRun;
    preregistration:MethodLabExperimentPreregistration;
    preregistrationRef:string;
  }>=[];
  for(const item of (runsResult.data??[]) as Row[]){
    const raw=row(item.raw_analysis);
    const rawRun=row(raw.run) as MethodLabExperimentRun;
    const experimentId=String(row(rawRun.artifacts).EXECUTED ? row(row(rawRun.artifacts).EXECUTED).experimentId??'' : '');
    if(!experimentId)continue;
    const prereg=await readInstitutionalMethodLabExperimentPreregistration(experimentId);
    if(!prereg)continue;
    let run:MethodLabExperimentRun;
    try{run=assertMethodLabExperimentRun(prereg.preregistration,rawRun);}catch{continue;}
    if(run.artifacts.CONTRAST.status!=='PENDING_RETURN')continue;
    pending.push({runRef:String(item.id),run,preregistration:prereg.preregistration,preregistrationRef:prereg.preregistrationRef});
  }

  if(!pending.length){
    return {ok:true as const,contract:SFI_JR_RETURN_RECONCILIATION_CONTRACT,pending:0,contrasted:0,waiting:0,results:[],writesPerformed:false};
  }

  const logbooks=unique(pending.map(item=>`FIELD_EPOCH:${item.preregistration.POPULATION_SYSTEM.ref}`));
  const earliest=pending
    .map(item=>Date.parse(item.preregistration.RETURN_WINDOW.opensAt))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b)[0];
  const epochsResult=await db.from('epistemic_events')
    .select('event_id,logbook_id,occurred_at,payload,lineage')
    .eq('event_name','SFI_FIELD_TEMPORAL_EPOCH_RECORDED')
    .in('logbook_id',logbooks)
    .gte('occurred_at',new Date(earliest).toISOString())
    .order('occurred_at',{ascending:false})
    .limit(SFI_SUPABASE_READ_BUDGET.jrReturnEpochRows + 1);
  if(epochsResult.error) throw new Error(`JR_RETURN_EPOCH_READ_FAILED:${epochsResult.error.message}`);
  if((epochsResult.data??[]).length>SFI_SUPABASE_READ_BUDGET.jrReturnEpochRows) return {ok:false as const,contract:SFI_JR_RETURN_RECONCILIATION_CONTRACT,pending:pending.length,contrasted:0,waiting:pending.length,results:[],writesPerformed:false,error:`JR_RETURN_EPOCH_BUDGET_EXCEEDED:limit=${SFI_SUPABASE_READ_BUDGET.jrReturnEpochRows}`};

  const epochsByLogbook=new Map<string,Row[]>();
  for(const event of [...((epochsResult.data??[]) as Row[])].reverse()){
    const logbook=String(event.logbook_id??'');
    const list=epochsByLogbook.get(logbook)??[];
    list.push(event);
    epochsByLogbook.set(logbook,list);
  }

  const results:Row[]=[];
  let contrasted=0;
  for(const item of pending){
    const prereg=item.preregistration;
    const run=item.run;
    const opensAt=Date.parse(prereg.RETURN_WINDOW.opensAt);
    const closesAt=prereg.RETURN_WINDOW.closesAt===null?null:Date.parse(prereg.RETURN_WINDOW.closesAt);
    const expected=prereg.EXPECTED_SIGNAL.measures.filter((measure)=>[
      'RELATION_WEIGHT_CHANGE','RELATION_STATE_CHANGE','RECURRENCE','STATE_OCCUPANCY','EMERGENCE','CAPACITY_RESPONSE',
    ].includes(measure));
    const epochs=(epochsByLogbook.get(`FIELD_EPOCH:${prereg.POPULATION_SYSTEM.ref}`)??[])
      .filter(event=>{
        const observed=Date.parse(String(event.occurred_at??''));
        return Number.isFinite(observed)&&observed>opensAt&&(closesAt===null||observed<=closesAt);
      });

    let matched:null|{event:Row;snapshot:Row;measures:string[];evidenceRefs:string[]}=null;
    for(const event of epochs){
      const snapshot=row(row(event.payload).snapshot);
      const observed=observedMeasures(snapshot);
      const measures=expected.filter(measure=>observed.includes(measure));
      if(!measures.length)continue;
      const evidenceRefs=await verifiedEvidenceRefs(epochCandidateRefs(event,snapshot));
      if(!evidenceRefs.length)continue;
      matched={event,snapshot,measures,evidenceRefs};
      break;
    }

    if(!matched){
      results.push({
        experimentId:run.artifacts.EXECUTED.experimentId,
        runId:run.artifacts.EXECUTED.runId,
        state:'WAITING_FOR_PREREGISTERED_REALITY',
        expectedMeasures:expected,
        candidateEpochs:epochs.length,
        condition:prereg.RETURN_WINDOW.condition??null,
      });
      continue;
    }

    const observedAt=String(matched.event.occurred_at);
    const contrast=await persistInstitutionalMethodLabRealityReturn({
      experimentId:run.artifacts.EXECUTED.experimentId,
      runId:run.artifacts.EXECUTED.runId,
      realityReturn:{
        source:'REALITY',
        observedAt,
        evidenceRefs:matched.evidenceRefs,
        outcome:{
          fieldEpochEventId:String(matched.event.event_id),
          matchedExpectedMeasures:matched.measures,
          observedMeasures:observedMeasures(matched.snapshot),
          condition:prereg.RETURN_WINDOW.condition??null,
          comparisonStatus:'RETURN_AVAILABLE_NOT_RESULT_VALIDATION',
          resultHash:run.artifacts.RESULT.resultHash,
        },
      },
      contrastPayload:{
        contract:SFI_JR_RETURN_RECONCILIATION_CONTRACT,
        conditionSatisfiedBy:'MECHANICALLY_MATCHED_POST_T0_FIELD_EPOCH',
        matchedExpectedMeasures:matched.measures,
        fieldEpochEventId:String(matched.event.event_id),
        resultValidation:'NOT_ESTABLISHED_BY_MEASURE_PRESENCE_ALONE',
      },
    });
    const learning=await recordInstitutionalMethodLabContrastLearningCandidate({
      experimentId:run.artifacts.EXECUTED.experimentId,
      runId:run.artifacts.EXECUTED.runId,
      actorId:input.actorId,
      tenantId:input.tenantId??'sfi',
    }).catch(error=>({ok:false,error:error instanceof Error?error.message:String(error)}));
    contrasted+=1;
    results.push({
      experimentId:run.artifacts.EXECUTED.experimentId,
      runId:run.artifacts.EXECUTED.runId,
      state:'CONTRAST_AVAILABLE',
      returnAnalysisId:contrast.analysisId,
      matchedExpectedMeasures:matched.measures,
      evidenceRefs:matched.evidenceRefs,
      fieldEpochEventId:String(matched.event.event_id),
      learning,
      boundary:'The post-T0 reality condition is satisfied only by a mechanically matched persisted field measure with verified evidence refs. This opens contrast; it does not validate the simulated result by itself.',
    });
  }

  return {
    ok:true as const,
    contract:SFI_JR_RETURN_RECONCILIATION_CONTRACT,
    pending:pending.length,
    contrasted,
    waiting:pending.length-contrasted,
    results,
    writesPerformed:contrasted>0,
  };
}
