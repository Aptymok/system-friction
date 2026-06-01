import { NextResponse } from 'next/server';
import { appendOperationalEvent, requireGovernedActor, updateActionProposalStatus } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim().length > 0 ? params.id.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.outcome');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
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
    execution_allowed: false,
    outcome_only: true,
  };

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.outcome_recorded',
    actorId: gate.ctx.user.id,
    confidence: 0.88,
    payload: eventPayload,
    lineage: [proposalId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await updateActionProposalStatus({
    proposalId,
    status: nextState,
    actorId: gate.ctx.user.id,
    isRoot: gate.ctx.isRoot,
    proposalType: 'twin_proposal',
    expectedStatuses: ['queued'],
    eventId: event.data.id,
    payloadPatch: {
      outcomeRecorded: true,
      outcomeStatus,
      fieldEffect,
      notes,
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
      executionAllowed: false,
    },
  });
}
