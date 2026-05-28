import { NextResponse } from 'next/server';
import { appendOperationalEvent, createActionProposal, requireGovernedActor, sha256 } from '@/lib/operational/common';
import { readTwinSelfObservation } from '@/lib/operational/twinState';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('twin.propose');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const selfObservation = await readTwinSelfObservation();
  const selfObservationPayload = {
    observed_graph_nodes: selfObservation.observed_graph_nodes,
    observed_graph_edges: selfObservation.observed_graph_edges,
    latest_kernel_status: selfObservation.latest_kernel_status,
    latest_governance_status: selfObservation.latest_governance_status,
    latest_worldspect_state: selfObservation.latest_worldspect_state,
  };
  const observed = await appendOperationalEvent({
    eventName: 'cognitive_twin.self_observed',
    actorId: gate.ctx.user.id,
    confidence: 0.72,
    payload: selfObservationPayload,
    lineage: [selfObservation.graph.loadedAt],
  });
  if (!observed.ok) return NextResponse.json(observed, { status: 400 });

  const payload = {
    quarantine: true,
    self_observation: selfObservationPayload,
    proposal: body.proposal ?? body,
    proposal_hash: sha256(body.proposal ?? body),
    requires_approval: true,
  };
  const event = await appendOperationalEvent({
    eventName: 'cognitive_twin.proposal.created',
    actorId: gate.ctx.user.id,
    payload,
    lineage: [selfObservation.graph.loadedAt, observed.data.id],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await createActionProposal({
    proposalType: 'twin_proposal',
    actorId: gate.ctx.user.id,
    title: 'cognitive_twin.proposal.created',
    graphNodeCount: selfObservation.observed_graph_nodes,
    graphEdgeCount: selfObservation.observed_graph_edges,
    inputVectorHash: sha256(payload.self_observation),
    status: 'proposed',
    eventId: event.data.id,
    payload,
  });

  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
