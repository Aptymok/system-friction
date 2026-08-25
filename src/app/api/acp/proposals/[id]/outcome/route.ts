import { NextResponse } from 'next/server';
import { appendOperationalEvent, requireGovernedActor, updateActionProposalStatus } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type Row = Record<string, unknown>;

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim().length > 0 ? params.id.trim() : null;
}

function asRecord(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
}

function normalizedOutcomeStatus(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'observed_effect';
}

function normalizedNextState(value: unknown) {
  if (value === 'needs_revision') return 'proposed';
  if (value === 'archived') return 'accepted';
  if (value === 'closed') return 'accepted';
  return 'accepted';
}

function isObservedReturnEvent(row: Row) {
  const name = typeof row.event_name === 'string' ? row.event_name.trim() : '';
  const epistemicClass = typeof row.epistemic_class === 'string' ? row.epistemic_class.trim().toLowerCase() : '';
  return epistemicClass === 'observed' && (name === 'SFI_PROPOSAL_RETURN_RECORDED' || name === 'SFI_UNIVERSAL_RETURN_RECORDED' || name.endsWith('_RETURN_RECORDED'));
}

function returnBelongsToProposal(row: Row, proposalId: string) {
  const payload = asRecord(row.payload);
  const payloadProposalId = typeof payload.proposalId === 'string'
    ? payload.proposalId.trim()
    : typeof payload.proposal_id === 'string'
      ? payload.proposal_id.trim()
      : '';
  const lineage = strings(row.lineage);
  return payloadProposalId === proposalId || lineage.includes(proposalId);
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.outcome');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Row;
  const returnEventId = typeof body.return_event_id === 'string' ? body.return_event_id.trim() : '';
  const evidenceRefs = strings(body.evidence_refs);
  if (!returnEventId || !evidenceRefs.length) {
    return NextResponse.json({
      ok: false,
      error: 'observed_return_and_evidence_required',
      required: ['return_event_id', 'evidence_refs[]'],
      boundary: 'A queued proposal cannot be closed by administrative declaration alone.',
    }, { status: 400 });
  }

  const current = await gate.ctx.service.from('action_proposals').select('*').eq('id', proposalId).single();
  if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });
  if (String(current.data.status ?? '').toLowerCase() !== 'queued') {
    return NextResponse.json({ ok: false, error: 'proposal_not_awaiting_return', status: current.data.status ?? null }, { status: 409 });
  }

  const returnEvent = await gate.ctx.service
    .from('epistemic_events')
    .select('event_id,event_name,epistemic_class,confidence,payload,lineage,occurred_at,source')
    .eq('event_id', returnEventId)
    .maybeSingle();
  if (returnEvent.error) return NextResponse.json({ ok: false, error: 'return_event_lookup_failed', details: returnEvent.error.message }, { status: 503 });
  if (!returnEvent.data || !isObservedReturnEvent(returnEvent.data as Row)) {
    return NextResponse.json({
      ok: false,
      error: 'observed_return_event_required',
      return_event_id: returnEventId,
      boundary: 'The referenced event must be an OBSERVED *_RETURN_RECORDED event.',
    }, { status: 409 });
  }
  if (!returnBelongsToProposal(returnEvent.data as Row, proposalId)) {
    return NextResponse.json({
      ok: false,
      error: 'return_event_proposal_mismatch',
      proposal_id: proposalId,
      return_event_id: returnEventId,
      boundary: 'A RETURN from another proposal/cycle cannot close this queued proposal.',
    }, { status: 409 });
  }

  const outcomeStatus = normalizedOutcomeStatus(body.outcome_status);
  const nextState = normalizedNextState(body.next_state);
  const fieldEffect = asRecord(body.field_effect);
  const notes = typeof body.notes === 'string' && body.notes.trim().length > 0 ? body.notes.trim() : null;

  const eventPayload = {
    proposal_id: proposalId,
    outcome_status: outcomeStatus,
    next_state: nextState,
    field_effect: fieldEffect,
    notes,
    return_event_id: returnEventId,
    evidence_refs: evidenceRefs,
    return_epistemic_class: returnEvent.data.epistemic_class ?? null,
    calibration_state: 'PENDING_REALITY_CALIBRATION',
    learning_state: 'CANDIDATE_UNTIL_CALIBRATED',
    canonical_promotion_allowed: false,
    outcome_only: true,
  };

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.outcome_recorded',
    actorId: gate.ctx.user.id,
    confidence: 0.88,
    payload: eventPayload,
    lineage: [proposalId, returnEventId, ...evidenceRefs],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await updateActionProposalStatus({
    proposalId,
    status: nextState,
    actorId: gate.ctx.user.id,
    isRoot: gate.ctx.isRoot,
    proposalType: typeof current.data.proposal_type === 'string' && current.data.proposal_type.trim() ? current.data.proposal_type : 'unknown',
    expectedStatuses: ['queued'],
    eventId: event.data.id,
    payloadPatch: {
      outcomeRecorded: true,
      outcomeStatus,
      fieldEffect,
      notes,
      returnEventId,
      evidenceRefs,
      calibrationState: 'PENDING_REALITY_CALIBRATION',
      learningState: 'CANDIDATE_UNTIL_CALIBRATED',
      canonicalPromotionAllowed: false,
      executionAllowed: false,
    },
  });

  if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

  return NextResponse.json({
    ok: true,
    data: {
      ...proposal.data,
      outcomeRecorded: true,
      outcomeStatus,
      fieldEffect,
      returnEventId,
      evidenceRefs,
      calibrationState: 'PENDING_REALITY_CALIBRATION',
      learningState: 'CANDIDATE_UNTIL_CALIBRATED',
      canonicalPromotionAllowed: false,
    },
  });
}
