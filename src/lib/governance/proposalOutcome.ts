import 'server-only';

import { appendOperationalEvent, recordValue, updateActionProposalStatus } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function isObservedReturnEvent(row: Row) {
  const name = typeof row.event_name === 'string' ? row.event_name.trim() : '';
  const epistemicClass = typeof row.epistemic_class === 'string' ? row.epistemic_class.trim().toLowerCase() : '';
  return epistemicClass === 'observed'
    && (name === 'SFI_PROPOSAL_RETURN_RECORDED' || name === 'SFI_UNIVERSAL_RETURN_RECORDED' || name.endsWith('_RETURN_RECORDED'));
}

function returnBelongsToProposal(row: Row, proposalId: string) {
  const payload = recordValue(row.payload);
  const payloadProposalId = typeof payload.proposalId === 'string'
    ? payload.proposalId.trim()
    : typeof payload.proposal_id === 'string'
      ? payload.proposal_id.trim()
      : '';
  return payloadProposalId === proposalId || strings(row.lineage).includes(proposalId);
}

export async function recordProposalOutcomeFromObservedReturn(input: {
  proposalId: string;
  actorId: string;
  returnEventId: string;
  evidenceRefs: string[];
  outcomeStatus?: string;
  nextState?: 'accepted' | 'proposed';
  fieldEffect?: Record<string, unknown>;
  notes?: string | null;
}) {
  const db = createServiceSupabaseClient();
  const proposal = await db.from('action_proposals').select('*').eq('id', input.proposalId).maybeSingle();
  if (proposal.error) return { ok: false as const, error: 'proposal_read_failed', details: proposal.error.message };
  if (!proposal.data) return { ok: false as const, error: 'proposal_not_found' };
  if (String(proposal.data.status ?? '').toLowerCase() !== 'queued') {
    return { ok: false as const, error: 'proposal_not_awaiting_return', status: proposal.data.status ?? null };
  }

  const returnEvent = await db
    .from('epistemic_events')
    .select('event_id,event_name,epistemic_class,confidence,payload,lineage,occurred_at,source')
    .eq('event_id', input.returnEventId)
    .maybeSingle();
  if (returnEvent.error) return { ok: false as const, error: 'return_event_lookup_failed', details: returnEvent.error.message };
  if (!returnEvent.data || !isObservedReturnEvent(returnEvent.data as Row)) {
    return { ok: false as const, error: 'observed_return_event_required' };
  }
  if (!returnBelongsToProposal(returnEvent.data as Row, input.proposalId)) {
    return { ok: false as const, error: 'return_event_proposal_mismatch' };
  }

  const evidenceRefs = [...new Set(input.evidenceRefs.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()))];
  if (!evidenceRefs.length) return { ok: false as const, error: 'evidence_refs_required' };

  const outcomeStatus = input.outcomeStatus?.trim() || 'observed_effect';
  const nextState = input.nextState ?? 'accepted';
  const fieldEffect = input.fieldEffect ?? {};
  const notes = input.notes?.trim() || null;

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.outcome_recorded',
    actorId: input.actorId,
    confidence: 0.88,
    payload: {
      proposal_id: input.proposalId,
      outcome_status: outcomeStatus,
      next_state: nextState,
      field_effect: fieldEffect,
      notes,
      return_event_id: input.returnEventId,
      evidence_refs: evidenceRefs,
      return_epistemic_class: returnEvent.data.epistemic_class ?? null,
      calibration_state: 'PENDING_REALITY_CALIBRATION',
      learning_state: 'CANDIDATE_UNTIL_CALIBRATED',
      canonical_promotion_allowed: false,
      outcome_only: true,
    },
    lineage: [input.proposalId, input.returnEventId, ...evidenceRefs],
  });
  if (!event.ok) return event;

  const proposalType = typeof proposal.data.proposal_type === 'string' && proposal.data.proposal_type.trim()
    ? proposal.data.proposal_type
    : 'unknown';

  return updateActionProposalStatus({
    proposalId: input.proposalId,
    status: nextState,
    actorId: input.actorId,
    isRoot: true,
    proposalType,
    expectedStatuses: ['queued'],
    eventId: event.data.id,
    payloadPatch: {
      outcomeRecorded: true,
      outcomeStatus,
      fieldEffect,
      notes,
      returnEventId: input.returnEventId,
      evidenceRefs,
      calibrationState: 'PENDING_REALITY_CALIBRATION',
      learningState: 'CANDIDATE_UNTIL_CALIBRATED',
      canonicalPromotionAllowed: false,
      executionAllowed: false,
      outcomeRecordedBy: input.actorId,
    },
  });
}
