import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendOperationalEvent, createActionProposal, readOperationalContext, requireGovernedActor, sha256, stringValue } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('mutations.propose');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const mutationType = stringValue(body.mutationType) ?? 'design_review';
  const context = await readOperationalContext();
  const payload = {
    mutation_type: mutationType,
    mutation: body.mutation ?? body,
    mutation_hash: sha256(body.mutation ?? body),
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
    .insert({
      proposal_id: proposal.data.id,
      event_id: event.data.id,
      actor_id: gate.ctx.user.id,
      mutation_type: mutationType,
      status: 'proposed',
      payload,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'logbook_mutation_insert_failed', details: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: { proposal: proposal.data, mutation: data } }, { status: 201 });
}
