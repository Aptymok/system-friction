import { RootNeuralGraphView } from '@/components/sfi/RootNeuralGraphView';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readRootNeuralGraphRuntime } from '@/lib/root/neuralGraphRuntime';
import { requireFounderPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function RootNeuralGraphPage() {
  await requireFounderPage('/root/neural-graph');

  const [graph, runtime] = await Promise.all([
    readCanonicalGraphState('sfi'),
    readRootNeuralGraphRuntime(),
  ]);

  return (
    <RootNeuralGraphView
      graph={{
        sourceState: graph.sourceState,
        degradedReason: graph.degradedReason,
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
        })),
      }}
      runtime={{
        nodeCount: runtime.nodeCount,
        edgeCount: runtime.edgeCount,
        status: runtime.status,
        summary: runtime.summary,
        readPlane: runtime.readPlane,
        primaryDiagnostic: runtime.primaryDiagnostic,
        latestWorldSpectObservedAt: runtime.latestWorldSpectObservedAt,
        scorefrictionObservationCount: runtime.scorefrictionObservationCount,
        scorefrictionVectorCount: runtime.scorefrictionVectorCount,
      }}
    />
  );
}
