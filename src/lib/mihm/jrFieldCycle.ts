import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { projectCognitiveGraph } from '@/lib/graph/cognitiveGraphAdmission';
import { deriveCanonicalFieldMethodSignal, resolveCanonicalFieldMethodology } from './rootCaseMethodology';
import { deriveFieldScientificReading } from './fieldScientificReading';
import { proposeMethodLabFieldProtocol } from '@/lib/method-lab/fieldProjection';
import { persistFieldTemporalEpoch } from './fieldTemporalPersistence';
import { deriveDistributedPhenomena, persistDistributedPhenomenonCandidate } from './distributedPhenomena';
import { dispatchScientificMethodToLab } from './scientificMethodDispatch';
import { executeScientificMethodsForNode, persistScientificMethodExecutions, readFieldEpochHistories } from './scientificMethodRuntime';
import { persistActiveObservationRequest } from './activeObservationQueue';
import { reconcileJrMethodLabReturns } from './jrReturnReconciliation';
import { persistPerturbationReviewCandidate } from './perturbationReviewQueue';
import { SFI_SUPABASE_READ_BUDGET } from '@/lib/supabase/readBudget';

export const SFI_JR_FIELD_CYCLE_CONTRACT = 'SFI-JR-FIELD-CYCLE-1.0' as const;

type JrCycleInput = {
  actorId: string;
  trigger: string;
  maxMethodRuns?: number;
  maxEpochWrites?: number;
  maxPhenomenonWrites?: number;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map((value) => value.trim()))];
}

export async function runJrFieldCycle(input: JrCycleInput) {
  const startedAt = new Date().toISOString();
  const canonical = await readCanonicalGraphState('sfi', { allowContinuity: true });
  const graph = projectCognitiveGraph(canonical);
  const maxMethodRuns = Math.max(0, Math.min(SFI_SUPABASE_READ_BUDGET.jrMethodRuns, input.maxMethodRuns ?? SFI_SUPABASE_READ_BUDGET.jrMethodRuns));
  const maxEpochWrites = Math.max(1, Math.min(SFI_SUPABASE_READ_BUDGET.jrEpochWrites, input.maxEpochWrites ?? SFI_SUPABASE_READ_BUDGET.jrEpochWrites));
  const maxPhenomenonWrites = Math.max(1, Math.min(SFI_SUPABASE_READ_BUDGET.jrPhenomenonWrites, input.maxPhenomenonWrites ?? SFI_SUPABASE_READ_BUDGET.jrPhenomenonWrites));

  const nodeReadings = graph.nodes.map((node) => {
    const reading = deriveFieldScientificReading(node, graph.edges);
    const signal = deriveCanonicalFieldMethodSignal(node, graph.edges);
    const methodology = resolveCanonicalFieldMethodology(node, graph.edges, signal);
    const declared = typeof node.attributes?.methodLabProtocolId === 'string'
      ? node.attributes.methodLabProtocolId
      : typeof node.attributes?.method_lab_protocol_id === 'string'
        ? node.attributes.method_lab_protocol_id
        : null;
    const declaredProtocolId = declared === 'sociotechnical_simulation' || declared === 'economic_simulation'
      ? declared
      : null;
    const proposal = proposeMethodLabFieldProtocol({
      declaredProtocolId,
      primaryMethodId: methodology.resolution.status === 'READY' ? methodology.resolution.primary?.methodId ?? null : null,
      evidenceModalities: methodology.input.evidenceModalities,
      worldContextRequested: methodology.input.worldContextRequested,
      requiresInterventionTracking: methodology.input.requiresInterventionTracking,
      ...signal,
    });
    return { node, reading, signal, methodology, proposal };
  });

  const phenomena = deriveDistributedPhenomena(graph.nodes, graph.edges);
  const scientificTargets = nodeReadings
    .filter((item) => item.reading.methodCompetition.state !== 'NO_CANDIDATE')
    .slice(0, SFI_SUPABASE_READ_BUDGET.jrScientificTargets);
  const nextObservations = uniqueStrings(nodeReadings.map((item) => item.reading.methodCompetition.nextObservation));
  const perturbationReviewCandidates = nodeReadings
    .filter((item) => item.reading.nextAction.decision === 'REVIEW_PERTURBATION_CANDIDATE')
    .map((item) => ({
      nodeId: item.node.nodeId,
      candidateRefs: item.reading.nextAction.candidateRefs,
      basis: item.reading.nextAction.basis,
      authorityRequired: true,
      reason: item.reading.nextAction.reason,
    }));

  const primaryWritable = graph.sourceState === 'observed' && graph.readPlane === 'SUPABASE';
  if (!primaryWritable) {
    return {
      ok: true as const,
      status: 'DEGRADED_READ_ONLY' as const,
      contract: SFI_JR_FIELD_CYCLE_CONTRACT,
      startedAt,
      completedAt: new Date().toISOString(),
      graphState: { sourceState: graph.sourceState, readPlane: graph.readPlane ?? 'UNAVAILABLE', degradedReason: graph.degradedReason },
      observed: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        distributedPhenomenonCandidates: phenomena.length,
        nextObservations,
        perturbationReviewCandidates,
      },
      epochs: [],
      phenomena: [],
      methodDispatches: [],
      writesPerformed: false,
      boundary: 'Jr remains read-only unless the canonical cognitive field is served from observed Supabase primary state. Continuity/projection reads may inform diagnosis but cannot cause Method Lab runs, learning, intervention or canonical mutation.',
    };
  }

  const epochReceipts: unknown[] = [];
  const epochTargets = nodeReadings
    .filter((item) =>
      item.reading.temporal.coordinates.length > 0
      || item.reading.relations.some((relation) => relation.previousState !== null || relation.weightDelta !== null || relation.onset !== null || relation.offset !== null)
      || item.reading.emergence.state !== 'NOT_ESTABLISHED',
    )
    .slice(0, maxEpochWrites);
  for (const item of epochTargets) {
    try {
      epochReceipts.push(await persistFieldTemporalEpoch({
        node: item.node,
        edges: graph.edges,
        actorId: input.actorId,
        trigger: input.trigger,
      }));
    } catch (error) {
      epochReceipts.push({ ok:false, nodeId:item.node.nodeId, error:error instanceof Error ? error.message : String(error) });
    }
  }

  let historyReadError:string|null=null;
  let epochHistories=new Map<string,Awaited<ReturnType<typeof readFieldEpochHistories>> extends Map<string,infer T> ? T : never>();
  try {
    epochHistories=await readFieldEpochHistories(scientificTargets.map((item)=>item.node.nodeId));
  } catch (error) {
    historyReadError=error instanceof Error?error.message:String(error);
  }

  const phenomenonReceipts: unknown[] = [];
  for (const candidate of phenomena.slice(0, maxPhenomenonWrites)) {
    try {
      phenomenonReceipts.push(await persistDistributedPhenomenonCandidate({
        candidate,
        actorId: input.actorId,
        trigger: input.trigger,
      }));
    } catch (error) {
      phenomenonReceipts.push({ ok:false, phenomenonId:candidate.phenomenonId, error:error instanceof Error ? error.message : String(error) });
    }
  }

  const scientificMethodExecutions: unknown[] = [];
  const activeObservationRequests: unknown[] = [];
  for (const item of scientificTargets) {
    try {
      const history = epochHistories.get(item.node.nodeId) ?? [];
      const executions = executeScientificMethodsForNode({
        node: item.node,
        edges: graph.edges,
        reading: item.reading,
        history,
      });
      const persistence = await persistScientificMethodExecutions({
        nodeId: item.node.nodeId,
        actorId: input.actorId,
        trigger: input.trigger,
        executions,
      });
      scientificMethodExecutions.push({
        nodeId:item.node.nodeId,
        executions,
        persistence,
      });
      if (item.reading.nextAction.decision === 'OBSERVE_NEXT' && item.reading.methodCompetition.nextObservation) {
        const request = await persistActiveObservationRequest({
          nodeId:item.node.nodeId,
          observation:item.reading.methodCompetition.nextObservation,
          actorId:input.actorId,
          trigger:input.trigger,
          methodFamilies:executions.filter((execution)=>execution.status==='EXECUTED').map((execution)=>execution.family),
          evidenceRefs:uniqueStrings(executions.flatMap((execution)=>execution.evidenceRefs)),
          historyEventIds:history.map((epoch)=>epoch.eventId),
          stoppingCondition:null,
        });
        activeObservationRequests.push({nodeId:item.node.nodeId,...request});
      }
    } catch (error) {
      scientificMethodExecutions.push({
        nodeId:item.node.nodeId,
        executions:[],
        persistence:{ok:false,persisted:false,error:error instanceof Error ? error.message : String(error)},
      });
      activeObservationRequests.push({
        nodeId:item.node.nodeId,
        ok:false,
        persisted:false,
        error:error instanceof Error ? error.message : String(error),
      });
    }
  }

  const perturbationReviewRequests: unknown[] = [];
  for (const item of nodeReadings.filter((entry)=>entry.reading.nextAction.decision === 'REVIEW_PERTURBATION_CANDIDATE' && Boolean(entry.reading.capacity)).slice(0,SFI_SUPABASE_READ_BUDGET.jrPhenomenonWrites)) {
    if (!item.reading.capacity) continue;
    try {
      const magnitude=item.reading.capacity.perturbationMagnitude;
      perturbationReviewRequests.push({
        nodeId:item.node.nodeId,
        ...(await persistPerturbationReviewCandidate({
          nodeId:item.node.nodeId,
          actorId:input.actorId,
          trigger:input.trigger,
          basis:item.reading.nextAction.basis,
          candidateRefs:item.reading.nextAction.candidateRefs,
          capacityEvidenceRefs:item.reading.capacity.evidenceRefs,
          observedRange:magnitude===null?null:{min:magnitude,max:magnitude},
          reason:item.reading.nextAction.reason,
        })),
      });
    } catch (error) {
      perturbationReviewRequests.push({
        nodeId:item.node.nodeId,
        ok:false,
        persisted:false,
        error:error instanceof Error ? error.message : String(error),
      });
    }
  }

  const methodDispatches: unknown[] = [];
  let executedRuns = 0;
  for (const item of nodeReadings) {
    if (executedRuns >= maxMethodRuns) break;
    if (item.reading.methodCompetition.state === 'NO_CANDIDATE') continue;
    if (!item.proposal.protocolId) continue;
    try {
      const dispatch = await dispatchScientificMethodToLab({
        node: item.node,
        edges: graph.edges,
        reading: item.reading,
        proposal: item.proposal,
        actorId: input.actorId,
        trigger: input.trigger,
      });
      methodDispatches.push({ nodeId:item.node.nodeId, ...dispatch });
      if (dispatch.state === 'EXECUTED') executedRuns += 1;
    } catch (error) {
      methodDispatches.push({ nodeId:item.node.nodeId, state:'DEGRADED', writesPerformed:false, error:error instanceof Error ? error.message : String(error) });
    }
  }

  const returnReconciliation = await reconcileJrMethodLabReturns({
    actorId: input.actorId,
    tenantId: 'sfi',
    maxRuns: SFI_SUPABASE_READ_BUDGET.jrReturnRuns,
  }).catch((error) => ({
    ok:false as const,
    contract:'SFI-JR-RETURN-RECONCILIATION-1.0',
    pending:0,
    contrasted:0,
    waiting:0,
    results:[],
    writesPerformed:false,
    error:error instanceof Error ? error.message : String(error),
  }));

  const persistedPerturbationRequests = perturbationReviewRequests.filter((item) =>
    typeof item === 'object'
    && item !== null
    && (item as {persisted?:boolean}).persisted === true
  ).length;
  const persistedObservationRequests = activeObservationRequests.filter((item) =>
    typeof item === 'object'
    && item !== null
    && (item as {persisted?:boolean}).persisted === true
  ).length;
  const persistedScientificMethods = scientificMethodExecutions.filter((item) =>
    typeof item === 'object'
    && item !== null
    && typeof (item as {persistence?:unknown}).persistence === 'object'
    && (item as {persistence?:{persisted?:boolean}}).persistence?.persisted === true
  ).length;
  const persistedEpochs = epochReceipts.filter((item) => typeof item === 'object' && item !== null && (item as {persisted?:boolean}).persisted === true).length;
  const persistedPhenomena = phenomenonReceipts.filter((item) => typeof item === 'object' && item !== null && (item as {persisted?:boolean}).persisted === true).length;
  const methodRuns = methodDispatches.filter((item) => typeof item === 'object' && item !== null && (item as {state?:string}).state === 'EXECUTED').length;
  const completedAt = new Date().toISOString();

  const cycleReceipt = await appendEpistemicEvent({
    returnMode:'receipt',
    eventName:'SFI_JR_FIELD_CYCLE_COMPLETED',
    epistemicClass:'derived',
    confidence:1,
    occurredAt:completedAt,
    source:{sourceId:input.actorId,sourceType:input.trigger},
    logbookId:'JR_FIELD',
    lineage:[],
    payload:{
      contract:SFI_JR_FIELD_CYCLE_CONTRACT,
      actorId:input.actorId,
      trigger:input.trigger,
      startedAt,
      completedAt,
      graphState:{sourceState:graph.sourceState,readPlane:graph.readPlane ?? 'UNAVAILABLE'},
      observed:{nodes:graph.nodes.length,edges:graph.edges.length,distributedPhenomenonCandidates:phenomena.length},
      persistence:{epochTargets:epochTargets.length,persistedEpochs,phenomenonCandidates:phenomena.length,persistedPhenomena},
      methods:{maxMethodRuns,methodRuns,scientificMethodExecutions,dispatches:methodDispatches},
      activeObservationRequests,
      perturbationReviewRequests,
      returnReconciliation,
      historyReadError,
      readBudget:SFI_SUPABASE_READ_BUDGET,
      nextObservations,
      perturbationReviewCandidates,
      materialPerturbationExecuted:false,
      canonicalMutation:false,
      returnFabricated:false,
      boundary:'Jr coordinates existing observation, field reading and Method Lab owners. It may persist derived temporal/configuration receipts and execute bounded SIMULATED Method Lab runs from persisted evidence. Material perturbation, governance decision, canon promotion and RETURN fabrication remain prohibited.',
    },
  });

  const writesPerformed = persistedEpochs > 0 || persistedPhenomena > 0 || persistedScientificMethods > 0 || persistedObservationRequests > 0 || persistedPerturbationRequests > 0 || methodRuns > 0 || returnReconciliation.writesPerformed === true || cycleReceipt.ok;
  const degradedDispatches = methodDispatches.filter((item) => typeof item === 'object' && item !== null && (item as {state?:string}).state === 'DEGRADED').length;
  const returnDegraded = returnReconciliation.ok === false;
  const historyDegraded = historyReadError !== null;

  return {
    ok: degradedDispatches === 0 && !returnDegraded && !historyDegraded,
    status: (degradedDispatches || returnDegraded || historyDegraded) ? 'DEGRADED' as const : 'COMPLETE' as const,
    contract:SFI_JR_FIELD_CYCLE_CONTRACT,
    startedAt,
    completedAt,
    graphState:{sourceState:graph.sourceState,readPlane:graph.readPlane ?? 'UNAVAILABLE',degradedReason:graph.degradedReason},
    observed:{
      nodes:graph.nodes.length,
      edges:graph.edges.length,
      distributedPhenomenonCandidates:phenomena.length,
      nextObservations,
      perturbationReviewCandidates,
    },
    epochs:epochReceipts,
    phenomena:phenomenonReceipts,
    scientificMethodExecutions,
    activeObservationRequests,
    perturbationReviewRequests,
    methodDispatches,
    returnReconciliation,
    historyReadError,
    readBudget:SFI_SUPABASE_READ_BUDGET,
    cycleReceipt:cycleReceipt.ok ? cycleReceipt.data : cycleReceipt,
    writesPerformed,
    boundary:'Observation and simulation may continue automatically within existing authority. Jr never turns a method result into observation, executes a material perturbation, promotes canon, makes a governance decision or fabricates RETURN.',
  };
}
