import { notFound, redirect } from 'next/navigation';
import { SfiConsole } from '@/components/sfi/SfiConsole';
import { RootNeuralGraphView } from '@/components/sfi/RootNeuralGraphView';
import { LEGACY_INTERNAL_SCENES, SCENE_KEYS, type SceneKey } from '@/components/sfi/scenes';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { projectCognitiveGraph } from '@/lib/graph/cognitiveGraphAdmission';
import { buildRealityPassport, readRealityPassportNode, readRealityChainEdge, realityPassportCoverage } from '@/lib/graph/realityChainProjection';
import { requireFounderPage } from '@/lib/system/access/server';
import { AuthenticatedSfiMenu } from '@/components/sfi/AuthenticatedSfiMenu';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { deriveCanonicalFieldMethodSignal, planCanonicalUnknownResolution, resolveCanonicalFieldMethodology } from '@/lib/mihm/rootCaseMethodology';
import { proposeMethodLabFieldProtocol, resolveMethodLabFieldProjection } from '@/lib/method-lab/fieldProjection';
import { deriveEmpiricalCapacityEnvelope, deriveFieldScientificReading } from '@/lib/mihm/fieldScientificReading';
import { deriveDistributedPhenomena, projectDistributedPhenomenaForRoot } from '@/lib/mihm/distributedPhenomena';
import { readMethodLabFieldLearningStates, readMethodLabFieldMethodResults } from '@/lib/method-lab/readModel';
import { readFieldEpochHistories } from '@/lib/mihm/scientificMethodRuntime';

export const dynamic = 'force-dynamic';

export default async function ScenePage({ params }:{ params:Promise<{scene:string}> }){
  const { scene } = await params;
  // Historical top-level surfaces are now absorbed by their canonical owner.
  // APIs/data contracts remain unchanged; this only removes competing page identities.
  if (scene === 'field') redirect('/observatory');
  if (scene === 'cases') redirect('/root?reading=CURRENT_STATE');
  if (scene === 'twin') redirect('/root?reading=RETROLONGITUDINAL');
  if ((LEGACY_INTERNAL_SCENES as readonly string[]).includes(scene)) redirect('/root');
  if(!SCENE_KEYS.includes(scene as SceneKey)) notFound();

  if(scene === 'root'){
    await requireFounderPage('/root');
    const canonicalGraph = await readCanonicalGraphState('sfi', { allowContinuity: true });
    const graph = projectCognitiveGraph(canonicalGraph);
    const fieldNodeRefs = graph.nodes.map((node) => node.nodeId);
    const [methodResults, learningStates, fieldEpochHistories] = await Promise.all([
      readMethodLabFieldMethodResults(fieldNodeRefs),
      readMethodLabFieldLearningStates(fieldNodeRefs),
      readFieldEpochHistories(fieldNodeRefs),
    ]);
    const fieldHistorySummaries = new Map(
      graph.nodes.map((node) => {
        const history = fieldEpochHistories.get(node.nodeId) ?? [];
        return [node.nodeId, {
          epochCount: history.length,
          firstObservedAt: history[0]?.occurredAt ?? null,
          lastObservedAt: history.at(-1)?.occurredAt ?? null,
          recentEpochs: history.slice(-8).map((epoch) => ({
            eventId: epoch.eventId,
            occurredAt: epoch.occurredAt,
            state: typeof epoch.snapshot.state === 'string' ? epoch.snapshot.state : null,
            previousState: typeof epoch.snapshot.previousState === 'string' ? epoch.snapshot.previousState : null,
            censoring: typeof epoch.snapshot.censoring === 'string' ? epoch.snapshot.censoring : 'UNKNOWN',
            relationTransitions: Array.isArray(epoch.snapshot.relationTransitions)
              ? epoch.snapshot.relationTransitions.slice(0, 12)
              : [],
          })),
          persistedHistory: history.length > 0,
        }];
      }),
    );

    const realityNodes = new Map(graph.nodes.map((node) => [node.nodeId, readRealityPassportNode(node)]));
    const realityEdges = new Map(graph.edges.map((edge) => [edge.edgeId, readRealityChainEdge(edge)]));
    const passportCoverage = realityPassportCoverage(graph.nodes);
    const realityPassports = new Map(graph.nodes.map((node) => [node.nodeId, buildRealityPassport(node, graph.edges)]));
    const methodSignals = new Map(
      graph.nodes.map((node) => [node.nodeId, deriveCanonicalFieldMethodSignal(node, graph.edges)]),
    );
    const fieldMethodResolutions = new Map(
      graph.nodes.map((node) => {
        const signal = methodSignals.get(node.nodeId)!;
        return [node.nodeId, resolveCanonicalFieldMethodology(node, graph.edges, signal)];
      }),
    );
    const unknownResolutionPlans = new Map(
      graph.nodes.map((node) => {
        const signal = methodSignals.get(node.nodeId)!;
        const methodology = fieldMethodResolutions.get(node.nodeId)!;
        return [node.nodeId, planCanonicalUnknownResolution(node, graph.edges, methodology, signal)];
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
          primaryMethodId: methodology.resolution.status === 'READY' ? methodology.resolution.primary?.methodId ?? null : null,
          evidenceModalities: methodology.input.evidenceModalities,
          worldContextRequested: methodology.input.worldContextRequested,
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

    const scientificReadings = new Map(
      graph.nodes.map((node) => [node.nodeId, deriveFieldScientificReading(node, graph.edges)]),
    );
    const capacityEnvelope = deriveEmpiricalCapacityEnvelope(graph.nodes);
    const distributedPhenomena = deriveDistributedPhenomena(graph.nodes, graph.edges);
    const distributedPhenomenonProjection = projectDistributedPhenomenaForRoot(distributedPhenomena, graph.loadedAt);

    // Read the existing institutional registry. A registered agent is not
    // presumed executed or assigned to a selected graph node.
    let agentRegistryState = 'UNAVAILABLE';
    let agents: Array<{
      agentKey:string;name:string;entityKind:string;capability:string;
      permissions:string;status:string;lifecycleState:string;lastRunAt:string|null
    }> = [];
    try {
      const { data, error } = await createServiceSupabaseClient()
        .from('root_agents')
        .select('agent_key,name,entity_kind,capability,permissions,status,lifecycle_state,last_run_at')
        .order('agent_key',{ascending:true})
        .limit(80);
      if (error) {
        agentRegistryState = 'UNAVAILABLE';
      } else {
        agents = (data ?? []).map(row=>({
          agentKey:String(row.agent_key),
          name:String(row.name ?? row.agent_key),
          entityKind:String(row.entity_kind ?? 'UNKNOWN'),
          capability:String(row.capability ?? 'NOT REPRESENTED'),
          permissions:String(row.permissions ?? 'UNKNOWN'),
          status:String(row.status ?? 'UNKNOWN'),
          lifecycleState:String(row.lifecycle_state ?? 'UNKNOWN'),
          lastRunAt:typeof row.last_run_at === 'string' ? row.last_run_at : null,
        }));
        agentRegistryState = data?.length ? 'AVAILABLE' : 'EMPTY';
      }
    } catch {
      agentRegistryState = 'UNAVAILABLE';
    }


    return (
      <main className="sfiOperatingShell sfiAuthenticatedViewport" data-root-primary-interface="CANONICAL_COGNITIVE_FIELD">
        <AuthenticatedSfiMenu/>
        <div className="sfiAuthenticatedViewportContent"><RootNeuralGraphView
          agents={agents}
          agentRegistryState={agentRegistryState}
          graph={{
            sourceState: graph.sourceState,
            degradedReason: graph.degradedReason,
            readPlane: graph.readPlane ?? 'UNAVAILABLE',
            primaryDiagnostic: graph.primaryDiagnostic ?? null,
            loadedAt: graph.loadedAt,
            nodes: [
              ...graph.nodes.map((node) => ({
              id: node.nodeId,
              label: node.label,
              type: node.ontologyType,
              origin: node.origin,
              provenance: node.provenance,
              lineage: node.lineage,
              attributes: node.attributes,
              reality: realityNodes.get(node.nodeId),
              realityPassport: realityPassports.get(node.nodeId),
              methodSignal: methodSignals.get(node.nodeId),
              methodResolution: fieldMethodResolutions.get(node.nodeId),
              unknownResolutionPlan: unknownResolutionPlans.get(node.nodeId),
              fieldProtocolProposal: fieldProtocolProposals.get(node.nodeId),
              fieldProjection: fieldProjections.get(node.nodeId),
              scientificReading: scientificReadings.get(node.nodeId),
              methodResult: methodResults.get(node.nodeId) ?? null,
              learningState: learningStates.get(node.nodeId) ?? null,
              fieldHistory: fieldHistorySummaries.get(node.nodeId) ?? null,
            })),
              ...distributedPhenomenonProjection.nodes.map((node) => ({
                id: node.nodeId,
                label: node.label,
                type: node.ontologyType,
                origin: node.origin,
                provenance: node.provenance,
                lineage: node.lineage,
                attributes: node.attributes,
              })),
            ],
            edges: [
              ...graph.edges.map((edge) => ({
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
              ...distributedPhenomenonProjection.edges.map((edge) => ({
                id: edge.edgeId,
                source: edge.sourceNodeId,
                target: edge.targetNodeId,
                relation: edge.relation,
                weight: edge.weight,
                origin: edge.origin,
                provenance: edge.provenance,
                lineage: edge.lineage,
                attributes: edge.attributes,
              })),
            ],
            realityCoverage: passportCoverage,
            capacityEnvelope,
            admission: graph.admission,
          }}
        /></div>
      </main>
    );
  }

  return <SfiConsole scene={scene as SceneKey}/>;
}
