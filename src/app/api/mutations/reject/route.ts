import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendOperationalEvent, buildMutationLogbookRow, requireGovernedActor, stringValue, updateActionProposalStatus } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('mutations.reject');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const proposalId = stringValue(body.proposalId);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const event = await appendOperationalEvent({
    eventName: 'mutation.rejected',
    actorId: gate.ctx.user.id,
    payload: { proposal_id: proposalId, reason: stringValue(body.reason) ?? 'design_rejected' },
    lineage: [proposalId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await updateActionProposalStatus({
    proposalId,
    status: 'rejected',
    actorId: gate.ctx.user.id,
    isRoot: gate.ctx.isRoot,
    proposalType: 'mutation',
    expectedStatuses: ['proposed', 'queued'],
    eventId: event.data.id,
  });
  if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

  const service = createServiceSupabaseClient();
  const reason = stringValue(body.reason) ?? 'design_rejected';
  await service.from('logbook_mutations').insert(buildMutationLogbookRow({
    proposalId,
    eventId: event.data.id,
    actorId: gate.ctx.user.id,
    mutationType: 'design_review',
    status: 'rejected',
    currentState: { proposal_id: proposalId, status: 'proposed' },
    proposedState: { proposal_id: proposalId, status: 'rejected', reason },
    payload: { proposal_id: proposalId, reason },
  }));

  return NextResponse.json({ ok: true, data: proposal.data });
}
