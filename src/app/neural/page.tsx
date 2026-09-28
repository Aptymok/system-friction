import { redirect } from 'next/navigation';
import { RootNeuralGraphView } from '@/components/sfi/RootNeuralGraphView';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { projectCognitiveGraph } from '@/lib/graph/cognitiveGraphAdmission';
import { readRealityChainNode, readRealityChainEdge, realityChainCoverage } from '@/lib/graph/realityChainProjection';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function SfiNeuralFieldPage() {
  try {
    await requireUserProfile();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      if (error.status === 503) redirect('/auth-unavailable?next=%2Fneural');
      if (error.status === 401) redirect('/login?next=%2Fneural');
    }
    redirect('/unauthorized');
  }

  // Authenticated read stays on the primary plane. Continuity escalation remains ROOT-only.
  const canonicalGraph = await readCanonicalGraphState('sfi');
  const graph = projectCognitiveGraph(canonicalGraph);
  const realityNodes = new Map(graph.nodes.map((node) => [node.nodeId, readRealityChainNode(node)]));
  const realityEdges = new Map(graph.edges.map((edge) => [edge.edgeId, readRealityChainEdge(edge)]));

  return <RootNeuralGraphView graph={{
    sourceState: graph.sourceState,
    degradedReason: graph.degradedReason,
    readPlane: graph.readPlane ?? 'UNAVAILABLE',
    primaryDiagnostic: graph.primaryDiagnostic ?? null,
    loadedAt: graph.loadedAt,
    nodes: graph.nodes.map((node) => ({
      id: node.nodeId, label: node.label, type: node.ontologyType, origin: node.origin,
      provenance: node.provenance, lineage: node.lineage, attributes: node.attributes,
      reality: realityNodes.get(node.nodeId),
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.edgeId, source: edge.sourceNodeId, target: edge.targetNodeId, relation: edge.relation,
      weight: edge.weight, origin: edge.origin, provenance: edge.provenance, lineage: edge.lineage,
      attributes: edge.attributes, reality: realityEdges.get(edge.edgeId),
    })),
    realityCoverage: realityChainCoverage(graph.nodes),
    admission: graph.admission,
  }} />;
}
