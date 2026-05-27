import { NextResponse } from 'next/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { readTwinSelfObservation } from '@/lib/operational/twinState';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readTwinSelfObservation();
  await appendEpistemicEvent({
    eventName: 'cognitive_twin.self_observed',
    epistemicClass: 'derived',
    confidence: 0.72,
    payload: {
      observed_graph_nodes: state.observed_graph_nodes,
      observed_graph_edges: state.observed_graph_edges,
      latest_kernel_status: state.latest_kernel_status,
      latest_governance_status: state.latest_governance_status,
      latest_worldspect_state: state.latest_worldspect_state,
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'cognitive_runtime' },
    logbookId: 'BR',
    lineage: [state.graph.loadedAt],
  }).catch(() => null);
  return NextResponse.json({ ok: true, data: state });
}
