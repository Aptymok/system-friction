import 'server-only';

import { createHash } from 'node:crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_ACTIVE_OBSERVATION_REQUEST_CONTRACT = 'SFI-ACTIVE-OBSERVATION-REQUEST-1.0' as const;

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function unique(values:string[]) {
  return [...new Set(values.map(value=>value.trim()).filter(Boolean))];
}

export async function persistActiveObservationRequest(input:{
  nodeId:string;
  observation:string;
  actorId:string;
  trigger:string;
  methodFamilies:string[];
  evidenceRefs:string[];
  historyEventIds:string[];
  stoppingCondition?:string|null;
}) {
  const observation=input.observation.trim();
  if(!observation) return {ok:true as const,persisted:false as const,skipped:true as const,reason:'EMPTY_OBSERVATION_REQUEST'};
  const historyEventIds=unique(input.historyEventIds);
  const evidenceRefs=unique(input.evidenceRefs);
  const fingerprint=sha256({
    contract:SFI_ACTIVE_OBSERVATION_REQUEST_CONTRACT,
    nodeId:input.nodeId,
    observation,
    methodFamilies:unique(input.methodFamilies).sort(),
    latestHistoryEventId:historyEventIds.at(-1)??null,
    stoppingCondition:input.stoppingCondition??null,
  });
  const eventId=`jr-observe:${fingerprint}`;
  const db=createServiceSupabaseClient();
  const existing=await db.from('epistemic_events').select('event_id').eq('event_id',eventId).maybeSingle();
  if(existing.data?.event_id){
    return {ok:true as const,persisted:false as const,skipped:true as const,reason:'IDENTICAL_OBSERVATION_REQUEST_ALREADY_OPEN',eventId,fingerprint};
  }

  const event=await appendEpistemicEvent({
    eventId,
    eventName:'SFI_JR_ACTIVE_OBSERVATION_REQUESTED',
    epistemicClass:'proposed',
    confidence:1,
    occurredAt:new Date().toISOString(),
    source:{sourceId:input.actorId,sourceType:input.trigger},
    logbookId:`JR_OBSERVATION:${input.nodeId}`,
    lineage:unique([...evidenceRefs,...historyEventIds]),
    payload:{
      contract:SFI_ACTIVE_OBSERVATION_REQUEST_CONTRACT,
      fingerprint,
      nodeId:input.nodeId,
      requestedObservation:observation,
      methodFamilies:unique(input.methodFamilies),
      evidenceRefs,
      historyEventIds,
      stoppingCondition:input.stoppingCondition??'Stop when the requested discriminating observation is materially acquired or shown infeasible under the same observation boundary.',
      noCalendarTimeoutInvented:true,
      acquisitionPerformed:false,
      materialPerturbation:false,
      authorityRequired:false,
      canonicalMutation:false,
      boundary:'This event records what SFI should observe next. It is not evidence that acquisition occurred, does not admit a source as evidence, does not execute a perturbation and does not alter canonical truth.',
    },
  });

  return event.ok
    ? {ok:true as const,persisted:true as const,skipped:false as const,eventId,fingerprint}
    : {ok:false as const,persisted:false as const,skipped:false as const,eventId,fingerprint,error:event.error};
}
