import { NextResponse } from 'next/server';
import { appendOperationalEvent, createActionProposal, requireGovernedActor, sha256, stringValue, readOperationalContext } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('projections.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const objective = stringValue(body.objective);
  if (!objective) return NextResponse.json({ ok: false, error: 'missing_objective' }, { status: 400 });

  const seed = stringValue(body.seed) ?? sha256({ objective, at: new Date().toISOString() }).slice(0, 16);
  const context = await readOperationalContext();
  const inputVector = {
    objective,
    seed,
    worldspectSnapshotId: context.worldspect?.id ?? null,
    graphNodeCount: context.graph.nodes.length,
    graphEdgeCount: context.graph.edges.length,
  };
  const event = await appendOperationalEvent({
    eventName: 'projection.job.created',
    actorId: gate.ctx.user.id,
    payload: {
      objective,
      objective_hash: sha256(objective),
      seed,
      worldspect_snapshot_id: context.worldspect?.id ?? null,
      graph_node_count: context.graph.nodes.length,
      graph_edge_count: context.graph.edges.length,
      input_vector_hash: sha256(inputVector),
      status: 'queued',
      requires_approval: true,
    },
    lineage: [context.worldspect?.snapshot_hash ?? context.graph.loadedAt],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await createActionProposal({
    proposalType: 'projection',
    actorId: gate.ctx.user.id,
    title: 'projection.job.created',
    objective,
    seed,
    worldspectSnapshotId: context.worldspect?.id ?? null,
    graphNodeCount: context.graph.nodes.length,
    graphEdgeCount: context.graph.edges.length,
    inputVectorHash: sha256(inputVector),
    status: 'queued',
    eventId: event.data.id,
    payload: event.data.payload as Record<string, unknown>,
  });

  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
