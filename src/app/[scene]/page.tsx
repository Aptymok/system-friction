import { notFound, redirect } from 'next/navigation';
import { SfiConsole } from '@/components/sfi/SfiConsole';
import { RootNeuralGraphView } from '@/components/sfi/RootNeuralGraphView';
import { LEGACY_INTERNAL_SCENES, SCENE_KEYS, type SceneKey } from '@/components/sfi/scenes';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { projectCognitiveGraph } from '@/lib/graph/cognitiveGraphAdmission';
import { readRealityChainNode, readRealityChainEdge, realityChainCoverage } from '@/lib/graph/realityChainProjection';
import { requireFounderPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function ScenePage({ params }:{ params:Promise<{scene:string}> }){
  const { scene } = await params;
  if ((LEGACY_INTERNAL_SCENES as readonly string[]).includes(scene)) redirect('/root');
  if(!SCENE_KEYS.includes(scene as SceneKey)) notFound();

  if(scene === 'root'){
    await requireFounderPage('/root');
    const canonicalGraph = await readCanonicalGraphState('sfi', { allowContinuity: true });
    const graph = projectCognitiveGraph(canonicalGraph);

    const realityNodes = new Map(graph.nodes.map((node) => [node.nodeId, readRealityChainNode(node)]));
    const realityEdges = new Map(graph.edges.map((edge) => [edge.edgeId, readRealityChainEdge(edge)]));
    const realityCoverage = realityChainCoverage(graph.nodes);

    return (
      <main className="sfiOperatingShell" data-root-primary-interface="CANONICAL_COGNITIVE_FIELD">
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
              attributes: node.attributes,
              reality: realityNodes.get(node.nodeId),
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
              attributes: edge.attributes,
              reality: realityEdges.get(edge.edgeId),
            })),
            realityCoverage,
            admission: graph.admission,
          }}
        />
      </main>
    );
  }

  return <SfiConsole scene={scene as SceneKey}/>;
}
