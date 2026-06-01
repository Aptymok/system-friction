import { NextResponse } from 'next/server';
import { appendOperationalEvent, requireGovernedActor } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim().length > 0 ? params.id.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.realize');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const approval = asRecord(body.approval);
  if (!(approval.explicit === true && approval.scope === 'internal_record_only')) {
    return NextResponse.json({ ok: false, error: 'explicit_internal_approval_required' }, { status: 403 });
  }

  const service = createServiceSupabaseClient();
  const { data: current, error: readError } = await service
    .from('action_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('status', 'queued')
    .maybeSingle();

  if (readError) return NextResponse.json({ ok: false, error: 'proposal_read_failed', details: readError.message }, { status: 400 });
  if (!current) return NextResponse.json({ ok: false, error: 'queued_proposal_not_found' }, { status: 400 });

  const now = new Date().toISOString();
  const outcome = asRecord(current.outcome);
  const patch = asRecord(outcome.payloadPatch);
  const plan = asRecord(patch.executionPlan);

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.internal_realization_recorded',
    actorId: gate.ctx.user.id,
    confidence: 0.9,
    payload: {
      proposal_id: proposalId,
      realization_scope: 'internal_record_only',
      external_action_allowed: false,
      realized_at: now,
      plan,
    },
    lineage: [proposalId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const { data, error } = await service
    .from('action_proposals')
    .update({
      status: 'accepted',
      executed_at: now,
      outcome: {
        ...outcome,
        actorId: gate.ctx.user.id,
        eventId: event.data.id,
        realizedAt: now,
        realizationScope: 'internal_record_only',
        externalActionAllowed: false,
        realizationRecorded: true,
        plan,
        updatedAt: now,
      },
    })
    .eq('id', proposalId)
    .eq('status', 'queued')
    .select('*')
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'proposal_realization_failed', details: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, data: { ...data, realizationRecorded: true, externalActionAllowed: false } });
}
