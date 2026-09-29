import 'server-only';

import { createHash } from 'node:crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_PERTURBATION_REVIEW_CONTRACT = 'SFI-PERTURBATION-REVIEW-CANDIDATE-1.0' as const;

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function unique(values:string[]) {
  return [...new Set(values.map(value=>value.trim()).filter(Boolean))];
}

export async function persistPerturbationReviewCandidate(input:{
  nodeId:string;
  actorId:string;
  trigger:string;
  basis:string[];
  candidateRefs:string[];
  capacityEvidenceRefs:string[];
  observedRange:{min:number|null;max:number|null}|null;
  reason:string;
}) {
  const candidateRefs=unique(input.candidateRefs);
  const capacityEvidenceRefs=unique(input.capacityEvidenceRefs);
  if(!candidateRefs.length || !capacityEvidenceRefs.length){
    return {
      ok:true as const,
      persisted:false as const,
      skipped:true as const,
      reason:'PERTURBATION_REVIEW_REQUIRES_CANDIDATE_AND_CAPACITY_RETURN_EVIDENCE',
    };
  }

  const fingerprint=sha256({
    contract:SFI_PERTURBATION_REVIEW_CONTRACT,
    nodeId:input.nodeId,
    basis:unique(input.basis).sort(),
    candidateRefs:candidateRefs.sort(),
    capacityEvidenceRefs:capacityEvidenceRefs.sort(),
    observedRange:input.observedRange,
  });
  const eventId=`jr-perturbation:${fingerprint}`;
  const db=createServiceSupabaseClient();
  const existing=await db.from('epistemic_events').select('event_id').eq('event_id',eventId).maybeSingle();
  if(existing.data?.event_id){
    return {ok:true as const,persisted:false as const,skipped:true as const,reason:'IDENTICAL_PERTURBATION_REVIEW_ALREADY_OPEN',eventId,fingerprint};
  }

  const event=await appendEpistemicEvent({
    eventId,
    eventName:'SFI_JR_PERTURBATION_REVIEW_REQUESTED',
    epistemicClass:'proposed',
    confidence:1,
    occurredAt:new Date().toISOString(),
    source:{sourceId:input.actorId,sourceType:input.trigger},
    logbookId:`JR_PERTURBATION:${input.nodeId}`,
    lineage:unique([...candidateRefs,...capacityEvidenceRefs]),
    payload:{
      contract:SFI_PERTURBATION_REVIEW_CONTRACT,
      fingerprint,
      nodeId:input.nodeId,
      basis:unique(input.basis),
      candidateRefs,
      capacityEvidenceRefs,
      observedRange:input.observedRange,
      reason:input.reason,
      authorityRequired:true,
      decisionOwner:'ROOT',
      executionPerformed:false,
      materialPerturbation:false,
      canonicalMutation:false,
      safeOperatingLimitClaim:false,
      boundary:'This record nominates a perturbation for sovereign review because prior evidence-linked perturbation/RETURN observations exist. It does not assert safety, optimality, causal effect, authority, or execution.',
    },
  });

  return event.ok
    ? {ok:true as const,persisted:true as const,skipped:false as const,eventId,fingerprint}
    : {ok:false as const,persisted:false as const,skipped:false as const,eventId,fingerprint,error:event.error};
}
