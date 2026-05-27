import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendOperationalEvent, requireGovernedActor, stringValue, updateActionProposalStatus } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('mutations.accept');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const proposalId = stringValue(body.proposalId);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const event = await appendOperationalEvent({
    eventName: 'mutation.accepted',
    actorId: gate.ctx.user.id,
    payload: { proposal_id: proposalId, status: 'design_approved', applies_graph_mutation: false },
    lineage: [proposalId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await updateActionProposalStatus({ proposalId, status: 'design_approved', eventId: event.data.id });
  if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

  const service = createServiceSupabaseClient();
  await service.from('logbook_mutations').insert({
    proposal_id: proposalId,
    event_id: event.data.id,
    actor_id: gate.ctx.user.id,
    mutation_type: 'design_review',
    status: 'design_approved',
    payload: { proposal_id: proposalId, applies_graph_mutation: false },
  });

  return NextResponse.json({ ok: true, data: proposal.data });
}
