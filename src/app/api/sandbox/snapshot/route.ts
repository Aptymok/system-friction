import { NextResponse } from 'next/server';
import { appendOperationalEvent, createActionProposal, readOperationalContext, requireGovernedActor, sha256 } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST() {
  const gate = await requireGovernedActor('sandbox.snapshot');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const context = await readOperationalContext();
  const snapshot = {
    graph: context.graph,
    capturedAt: new Date().toISOString(),
    note: 'sandbox snapshot is read-only and does not mutate graph state',
  };
  const event = await appendOperationalEvent({
    eventName: 'sandbox.snapshot.created',
    actorId: gate.ctx.user.id,
    payload: {
      snapshot_hash: sha256(snapshot),
      graph_node_count: context.graph.nodes.length,
      graph_edge_count: context.graph.edges.length,
      snapshot,
      requires_approval: true,
    },
    lineage: [context.graph.loadedAt],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await createActionProposal({
    proposalType: 'sandbox_snapshot',
    actorId: gate.ctx.user.id,
    title: 'sandbox.snapshot.created',
    graphNodeCount: context.graph.nodes.length,
    graphEdgeCount: context.graph.edges.length,
    inputVectorHash: sha256(snapshot),
    status: 'queued',
    eventId: event.data.id,
    payload: event.data.payload as Record<string, unknown>,
  });

  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
