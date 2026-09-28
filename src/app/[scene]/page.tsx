import { notFound, redirect } from 'next/navigation';
import { SfiConsole } from '@/components/sfi/SfiConsole';
import { RootNeuralGraphView } from '@/components/sfi/RootNeuralGraphView';
import { LEGACY_INTERNAL_SCENES, SCENE_KEYS, type SceneKey } from '@/components/sfi/scenes';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { projectCognitiveGraph } from '@/lib/graph/cognitiveGraphAdmission';
import { readRealityChainNode, readRealityChainEdge, realityChainCoverage } from '@/lib/graph/realityChainProjection';
import { requireFounderPage } from '@/lib/system/access/server';
import { AuthenticatedSfiMenu } from '@/components/sfi/AuthenticatedSfiMenu';
import { deriveCanonicalFieldMethodSignal, resolveCanonicalFieldMethodology } from '@/lib/mihm/rootCaseMethodology';
import { proposeMethodLabFieldProtocol, resolveMethodLabFieldProjection } from '@/lib/method-lab/fieldProjection';

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
    const methodSignals = new Map(
      graph.nodes.map((node) => [node.nodeId, deriveCanonicalFieldMethodSignal(node, graph.edges)]),
    );
    const fieldMethodResolutions = new Map(
      graph.nodes.map((node) => {
        const signal = methodSignals.get(node.nodeId)!;
        return [node.nodeId, resolveCanonicalFieldMethodology(node, graph.edges, signal)];
      }),
    );
    const fieldProtocolProposals = new Map(
      graph.nodes.map((node) => {
        const signal = methodSignals.get(node.nodeId)!;
        const declared = typeof node.attributes?.methodLabProtocolId === 'string'
          ? node.attributes.methodLabProtocolId
          : typeof node.attributes?.method_lab_protocol_id === 'string'
            ? node.attributes.method_lab_protocol_id
            : null;
        const declaredProtocolId = declared === 'sociotechnical_simulation' || declared === 'economic_simulation' ? declared : null;
        const methodology = fieldMethodResolutions.get(node.nodeId)!;
        return [node.nodeId, proposeMethodLabFieldProtocol({
          declaredProtocolId,
          primaryMethodId: methodology.resolution.primary?.methodId ?? null,
          evidenceModalities: methodology.input.evidenceModalities,
          worldContextRequested: methodology.input.worldContextRequested,
          requiresTrajectory: methodology.input.requiresTrajectory,
          requiresRivalHypothesis: methodology.input.requiresRivalHypothesis,
          requiresInterventionTracking: methodology.input.requiresInterventionTracking,
          ...signal,
        })];
      }),
    );
    const fieldProjections = new Map(
      graph.nodes.map((node) => {
        const signal = methodSignals.get(node.nodeId)!;
        const proposal = fieldProtocolProposals.get(node.nodeId)!;
        return [node.nodeId, resolveMethodLabFieldProjection({ protocolId: proposal.protocolId, ...signal })];
      }),
    );

    return (
      <main className="sfiOperatingShell sfiAuthenticatedViewport" data-root-primary-interface="CANONICAL_COGNITIVE_FIELD">
        <AuthenticatedSfiMenu/>
        <div className="sfiAuthenticatedViewportContent"><RootNeuralGraphView
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
              methodSignal: methodSignals.get(node.nodeId),
              methodResolution: fieldMethodResolutions.get(node.nodeId),
              fieldProtocolProposal: fieldProtocolProposals.get(node.nodeId),
              fieldProjection: fieldProjections.get(node.nodeId),
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
        /></div>
      </main>
    );
  }

  return <SfiConsole scene={scene as SceneKey}/>;
}
