import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_JR_FIELD_READ_MODEL_CONTRACT = 'SFI-JR-FIELD-READ-MODEL-1.0' as const;

type Row=Record<string,unknown>;
function row(value:unknown):Row{return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};}
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null;}

export type JrFieldOperationalState={
  contract:typeof SFI_JR_FIELD_READ_MODEL_CONTRACT;
  nodeId:string;
  activeObservation:null|{eventId:string;occurredAt:string;requestedObservation:string;acquisitionPerformed:false};
  perturbationReview:null|{eventId:string;occurredAt:string;reason:string;authorityRequired:true;executionPerformed:false};
  scientificMethods:null|{eventId:string;occurredAt:string;executionCount:number;families:string[]};
  methodLabDispatch:null|{eventId:string;occurredAt:string;protocolId:string|null;experimentId:string|null;returnBasis:string|null};
  latestActivityAt:string|null;
};

export async function readJrFieldOperationalStates(nodeRefs:string[]){
  const refs=new Set(nodeRefs.map(value=>value.trim()).filter(Boolean));
  const states=new Map<string,JrFieldOperationalState>();
  for(const ref of refs){
    states.set(ref,{
      contract:SFI_JR_FIELD_READ_MODEL_CONTRACT,
      nodeId:ref,
      activeObservation:null,
      perturbationReview:null,
      scientificMethods:null,
      methodLabDispatch:null,
      latestActivityAt:null,
    });
  }
  if(!refs.size)return states;

  const db=createServiceSupabaseClient();
  const result=await db.from('epistemic_events')
    .select('event_id,event_name,occurred_at,payload')
    .in('event_name',[
      'SFI_JR_ACTIVE_OBSERVATION_REQUESTED',
      'SFI_JR_PERTURBATION_REVIEW_REQUESTED',
      'SFI_FIELD_SCIENTIFIC_METHODS_EXECUTED',
      'SFI_JR_METHOD_LAB_DISPATCH_COMPLETED',
    ])
    .order('occurred_at',{ascending:false})
    .limit(1600);
  if(result.error)return states;

  for(const event of (result.data??[]) as Row[]){
    const payload=row(event.payload);
    const nodeId=text(payload.nodeId)??text(payload.fieldNodeId);
    if(!nodeId||!refs.has(nodeId))continue;
    const state=states.get(nodeId);
    if(!state)continue;
    const eventId=String(event.event_id??'');
    const occurredAt=String(event.occurred_at??'');
    const eventName=String(event.event_name??'');
    if(!state.latestActivityAt)state.latestActivityAt=occurredAt;

    if(eventName==='SFI_JR_ACTIVE_OBSERVATION_REQUESTED'&&!state.activeObservation){
      state.activeObservation={
        eventId,
        occurredAt,
        requestedObservation:text(payload.requestedObservation)??'Observation request persisted without human-readable description.',
        acquisitionPerformed:false,
      };
    }else if(eventName==='SFI_JR_PERTURBATION_REVIEW_REQUESTED'&&!state.perturbationReview){
      state.perturbationReview={
        eventId,
        occurredAt,
        reason:text(payload.reason)??'Perturbation candidate requires ROOT review.',
        authorityRequired:true,
        executionPerformed:false,
      };
    }else if(eventName==='SFI_FIELD_SCIENTIFIC_METHODS_EXECUTED'&&!state.scientificMethods){
      const executions=Array.isArray(payload.executions)?payload.executions.filter((item)=>item&&typeof item==='object') as Row[]:[];
      state.scientificMethods={
        eventId,
        occurredAt,
        executionCount:executions.length,
        families:[...new Set(executions.map(item=>text(item.family)).filter((item):item is string=>Boolean(item)))],
      };
    }else if(eventName==='SFI_JR_METHOD_LAB_DISPATCH_COMPLETED'&&!state.methodLabDispatch){
      const returnWindow=row(payload.returnWindow);
      state.methodLabDispatch={
        eventId,
        occurredAt,
        protocolId:text(payload.protocolId),
        experimentId:text(payload.experimentId),
        returnBasis:text(returnWindow.basis)??'CHRONOLOGY',
      };
    }
  }
  return states;
}
