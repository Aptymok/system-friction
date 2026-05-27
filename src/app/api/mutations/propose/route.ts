import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendOperationalEvent, buildMutationLogbookRow, createActionProposal, readOperationalContext, requireGovernedActor, sha256, stringValue } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('mutations.propose');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const mutationType = stringValue(body.mutationType) ?? 'design_review';
  const mutation = body.mutation ?? body;
  const target = stringValue(body.target) ?? 'action_proposals';
  const context = await readOperationalContext();
  const payload = {
    mutation_type: mutationType,
    mutation,
    mutation_hash: sha256(mutation),
    quarantine: true,
    requires_approval: true,
    graph_node_count: context.graph.nodes.length,
    graph_edge_count: context.graph.edges.length,
  };
  const event = await appendOperationalEvent({ eventName: 'mutation.proposed', actorId: gate.ctx.user.id, payload, lineage: [context.graph.loadedAt] });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await createActionProposal({
    proposalType: 'mutation',
    actorId: gate.ctx.user.id,
    title: 'mutation.proposed',
    graphNodeCount: context.graph.nodes.length,
    graphEdgeCount: context.graph.edges.length,
    inputVectorHash: sha256(payload),
    status: 'proposed',
    eventId: event.data.id,
    payload,
  });
  if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('logbook_mutations')
    .insert(buildMutationLogbookRow({
      proposalId: proposal.data.id,
      eventId: event.data.id,
      actorId: gate.ctx.user.id,
      mutationType,
      status: 'proposed',
      target,
      currentState: body.currentState ?? null,
      proposedState: body.proposedState ?? mutation,
      coherenceDelta: typeof body.coherenceDelta === 'number' ? body.coherenceDelta : 0,
      payload,
    }))
    .select('*')
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'logbook_mutation_insert_failed', details: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: { proposal: proposal.data, mutation: data } }, { status: 201 });
}
