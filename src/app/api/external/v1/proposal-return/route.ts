import { NextResponse } from 'next/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function validObservedAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
}

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'execute');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'execute'), { status: 401 });

  const body = await req.json().catch(() => ({})) as Row;
  const proposalId = typeof body.proposal_id === 'string' ? body.proposal_id.trim() : '';
  const observedAt = validObservedAt(body.observed_at);
  const evidenceRefs = strings(body.evidence_refs);
  const hasOutcome = Object.prototype.hasOwnProperty.call(body, 'outcome');
  if (!proposalId || !observedAt || !hasOutcome || !evidenceRefs.length) {
    return NextResponse.json({
      ok: false,
      error: 'proposal_return_contract_incomplete',
      required: ['proposal_id', 'observed_at', 'outcome', 'evidence_refs[]'],
    }, { status: 400 });
  }

  const db = createServiceSupabaseClient();
  const proposal = await db.from('action_proposals').select('id,status,outcome').eq('id', proposalId).maybeSingle();
  if (proposal.error) return NextResponse.json({ ok: false, error: 'proposal_read_failed', details: proposal.error.message }, { status: 503 });
  if (!proposal.data) return NextResponse.json({ ok: false, error: 'proposal_not_found' }, { status: 404 });
  if (String(proposal.data.status ?? '').toLowerCase() !== 'queued') {
    return NextResponse.json({ ok: false, error: 'queued_proposal_required_for_return', status: proposal.data.status ?? null }, { status: 409 });
  }

  const actorId = externalActor(auth.credential);
  const confidenceInput = typeof body.confidence === 'number' ? body.confidence : 0.9;
  const confidence = Math.max(0, Math.min(1, confidenceInput));
  const event = await appendEpistemicEvent({
    eventName: 'SFI_PROPOSAL_RETURN_RECORDED',
    epistemicClass: 'observed',
    confidence,
    payload: {
      contract: 'SFI-PROPOSAL-RETURN-1.0',
      proposalId,
      actorId,
      credentialLabel: auth.credential.label ?? null,
      observedAt,
      outcome: body.outcome,
      classification: typeof body.classification === 'string' ? body.classification.trim() || null : null,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      evidenceRefs,
      executionDispatchedBySfi: false,
      canonicalPromotionAllowed: false,
      instruction: 'This RETURN is evidence-linked to the queued proposal. It does not close the proposal, prove causality, complete calibration, or promote canon.',
    },
    occurredAt: observedAt,
    source: { sourceId: actorId, sourceType: 'external_executor_return' },
    logbookId: `proposal-return:${proposalId}`,
    lineage: [proposalId, ...evidenceRefs],
  });
  if (!event.ok) return NextResponse.json(event, { status: 500 });

  const eventId = String(event.data.event_id ?? '');
  return NextResponse.json({
    ok: true,
    proposalId,
    eventId,
    event: event.data,
    next: 'ROOT may record the proposal outcome only by referencing this observed RETURN event and its evidence. Reality calibration and learning remain separate stages.',
    boundary: {
      proposalStatusChanged: false,
      executedAtWritten: false,
      executionDispatchedBySfi: false,
      calibrationCompleted: false,
      canonicalPromotionAllowed: false,
    },
  }, { status: 201 });
}
