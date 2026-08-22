import { NextResponse } from 'next/server';
import { appendOperationalEvent, recordValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'execute');
  const cred = auth.credential;
  if (!cred) {
    return NextResponse.json({ ok: false, error: 'unauthorized', auth: { tokenPresent: auth.tokenPresent, registryConfigured: auth.registryConfigured, scopeAllowed: auth.scopeAllowed, acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'] } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const proposalId = String(body.proposal_id || '').trim();
  if (!proposalId) return NextResponse.json({ ok: false, error: 'proposal_id_required' }, { status: 400 });
  if (body.confirm !== true) return NextResponse.json({ ok: false, error: 'explicit_confirmation_required' }, { status: 400 });

  const db = createServiceSupabaseClient();
  const read = await db.from('action_proposals').select('*').eq('id', proposalId).eq('status', 'queued').maybeSingle();
  if (read.error) return NextResponse.json({ ok: false, error: 'proposal_read_failed', details: read.error.message }, { status: 400 });
  if (!read.data) return NextResponse.json({ ok: false, error: 'queued_governed_proposal_required', message: 'La IA no puede aprobar su propia propuesta. ROOT debe aprobarla y prepararla primero.' }, { status: 409 });

  const current = read.data as Record<string, unknown>;
  const outcome = recordValue(current.outcome);
  const patch = recordValue(outcome.payloadPatch);
  const plan = recordValue(patch.executionPlan);
  const now = new Date().toISOString();
  const actor = externalActor(cred);
  const event = await appendOperationalEvent({ eventName: 'acp.proposal.external_agent_internal_realization', actorId: actor, confidence: 1, payload: { proposal_id: proposalId, credential_label: cred.label || 'external-agent', realization_scope: 'internal_record_only', external_action_allowed: false, realized_at: now, plan }, lineage: [proposalId] });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const update = await db.from('action_proposals').update({ status: 'accepted', executed_at: now, outcome: { ...outcome, actorId: actor, eventId: event.data.id, realizedAt: now, realizationScope: 'internal_record_only', externalActionAllowed: false, realizationRecorded: true, plan } }).eq('id', proposalId).eq('status', 'queued').select('*').single();
  if (update.error) return NextResponse.json({ ok: false, error: 'proposal_realization_failed', details: update.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: { ...update.data, realizationRecorded: true, externalActionAllowed: false }, message: 'Realización interna registrada con linaje. No se ejecutó una acción externa no gobernada.' });
}
