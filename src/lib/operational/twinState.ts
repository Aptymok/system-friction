import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { latestActionProposals } from './common';

export async function readTwinSelfObservation() {
  const [graph, worldspect, kernel, governance, proposals] = await Promise.all([
    readCanonicalGraphState('sfi'),
    getLatestWorldSpectSnapshot(),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
    latestActionProposals(['twin_proposal'], 10),
  ]);
  const latestCampoState = kernel?.campo_state && typeof kernel.campo_state === 'object'
    ? kernel.campo_state as Record<string, unknown>
    : null;

  return {
    observed_graph_nodes: graph.nodes.length,
    observed_graph_edges: graph.edges.length,
    latest_kernel_status: kernel?.status ?? null,
    latest_governance_status: governance.status,
    latest_worldspect_state: worldspect?.source_state ?? null,
    graph,
    worldspect: worldspect ? snapshotRowToApiData(worldspect) : null,
    kernel: kernel
      ? {
        id: kernel.id,
        status: kernel.status,
        observedAt: typeof latestCampoState?.observedAt === 'string' ? latestCampoState.observedAt : kernel.created_at,
      }
      : null,
    governance,
    proposals: proposals.data,
    warnings: [graph.degradedReason, governance.warning, proposals.error].filter(Boolean),
  };
}
