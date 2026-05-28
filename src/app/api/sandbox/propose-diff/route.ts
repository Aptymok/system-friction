import { NextResponse } from 'next/server';
import { appendOperationalEvent, createActionProposal, readOperationalContext, requireGovernedActor, sha256 } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('sandbox.propose_diff');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const diff = await req.json().catch(() => ({}));
  const context = await readOperationalContext();
  const payload = {
    diff,
    diff_hash: sha256(diff),
    quarantine: true,
    requires_approval: true,
    graph_node_count: context.graph.nodes.length,
    graph_edge_count: context.graph.edges.length,
  };
  const event = await appendOperationalEvent({
    eventName: 'sandbox.diff.proposed',
    actorId: gate.ctx.user.id,
    payload,
    lineage: [context.graph.loadedAt],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await createActionProposal({
    proposalType: 'sandbox_diff',
    actorId: gate.ctx.user.id,
    title: 'sandbox.diff.proposed',
    graphNodeCount: context.graph.nodes.length,
    graphEdgeCount: context.graph.edges.length,
    inputVectorHash: sha256(diff),
    status: 'proposed',
    eventId: event.data.id,
    payload,
  });

  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
