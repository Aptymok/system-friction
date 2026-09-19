import { RootNeuralGraphView } from '@/components/sfi/RootNeuralGraphView';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { requireFounderPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function RootNeuralGraphPage() {
  await requireFounderPage('/root/neural-graph');
  const graph = await readCanonicalGraphState('sfi');

  return (
    <RootNeuralGraphView
      graph={{
        sourceState: graph.sourceState,
        degradedReason: graph.degradedReason,
        readPlane: graph.readPlane ?? 'UNAVAILABLE',
        primaryDiagnostic: graph.primaryDiagnostic ?? null,
        loadedAt: graph.loadedAt,
        nodes: graph.nodes.map((node) => ({
          id: node.nodeId,
          label: node.label,
          type: node.ontologyType,
          origin: node.origin,
          provenance: node.provenance,
          lineage: node.lineage,
        })),
        edges: graph.edges.map((edge) => ({
          id: edge.edgeId,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          relation: edge.relation,
          weight: edge.weight,
          origin: edge.origin,
          provenance: edge.provenance,
          lineage: edge.lineage,
        })),
      }}
    />
  );
}
