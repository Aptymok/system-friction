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

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.approve');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.approved',
    actorId: gate.ctx.user.id,
    confidence: 0.92,
    payload: {
      proposal_id: proposalId,
      status: 'design_approved',
      approval_only: true,
      execution_allowed: false,
      note,
    },
    lineage: [proposalId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await updateActionProposalStatus({
    proposalId,
    status: 'design_approved',
    actorId: gate.ctx.user.id,
    isRoot: gate.ctx.isRoot,
    proposalType: 'twin_proposal',
    expectedStatuses: ['proposed'],
    eventId: event.data.id,
    payloadPatch: {
      approvalOnly: true,
      executionAllowed: false,
      note,
    },
  });

  return NextResponse.json(proposal, { status: proposal.ok ? 200 : 400 });
}
