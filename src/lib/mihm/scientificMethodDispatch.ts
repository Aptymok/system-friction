import 'server-only';

import { createHash } from 'node:crypto';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';
import type { FieldProtocolProposal } from '@/lib/method-lab/fieldProjection';
import type { FieldScientificReading } from './fieldScientificReading';

export const SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT = 'SFI-SCIENTIFIC-METHOD-DISPATCH-1.0' as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXECUTABLE_PROTOCOLS = new Set(['sociotechnical_simulation','economic_simulation']);

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function textList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

function candidateEvidenceRefs(node: CanonicalGraphNode, reading: FieldScientificReading) {
  return [...new Set([
    ...node.lineage,
    ...reading.reversibility.sourceObservationRefs,
    ...reading.relations.flatMap((relation) => relation.evidenceRefs ?? []),
    ...textList(node.attributes.evidenceRefs),
    ...textList(node.attributes.evidence_refs),
    ...textList(node.attributes.returnEvidenceRefs),
    ...textList(node.attributes.return_evidence_refs),
  ])];
}

async function resolvePersistedEvidenceIds(refs: string[]) {
  const requested = [...new Set(refs.filter((ref) => UUID_RE.test(ref)))].slice(0, 80);
  if (!requested.length) return [];
  const db = createServiceSupabaseClient();
  const [root, ledger] = await Promise.all([
    db.from('root_evidence_entries').select('id').in('id', requested),
    db.from('sfi_evidence_ledger').select('id').in('id', requested),
  ]);
  if (root.error || ledger.error) return [];
  const ids = [
    ...(root.data ?? []).map((row) => String(row.id)),
    ...(ledger.data ?? []).map((row) => String(row.id)),
  ];
  return [...new Set(ids)];
}

export type ScientificMethodDispatchResult =
  | { state:'ABSTAIN'; reason:string; protocolId:null|string; methodFamilies:string[]; evidenceIds:string[]; writesPerformed:false }
  | { state:'METHOD_LAB_REQUIRED'; reason:string; protocolId:string|null; methodFamilies:string[]; evidenceIds:string[]; writesPerformed:false }
  | { state:'ALREADY_EXECUTED'; reason:string; protocolId:string; methodFamilies:string[]; evidenceIds:string[]; receiptEventId:string; writesPerformed:false }
  | { state:'EXECUTED'; reason:string; protocolId:string; methodFamilies:string[]; evidenceIds:string[]; labAnalysisId:string; labRunId:string; resultHash:string|null; receiptEventId:string|null; writesPerformed:true };

export async function dispatchScientificMethodToLab(input: {
  node: CanonicalGraphNode;
  edges: CanonicalGraphEdge[];
  reading: FieldScientificReading;
  proposal: FieldProtocolProposal;
  actorId: string;
  trigger: string;
}): Promise<ScientificMethodDispatchResult> {
  const methodFamilies = input.reading.methodCompetition.candidates
    .filter((candidate) => candidate.assumptionCheck === 'OBSERVABLE')
    .map((candidate) => candidate.family);

  if (!methodFamilies.length) {
    return { state:'ABSTAIN', reason:'NO_OBSERVABLE_METHOD_CANDIDATE', protocolId:input.proposal.protocolId, methodFamilies, evidenceIds:[], writesPerformed:false };
  }

  const protocolId = input.proposal.protocolId;
  if (!protocolId) {
    return { state:'METHOD_LAB_REQUIRED', reason:'NO_EXECUTABLE_PROTOCOL_SELECTED_FOR_OBSERVED_METHOD_NEEDS', protocolId:null, methodFamilies, evidenceIds:[], writesPerformed:false };
  }
  if (!EXECUTABLE_PROTOCOLS.has(protocolId)) {
    return { state:'METHOD_LAB_REQUIRED', reason:'SELECTED_PROTOCOL_HAS_NO_PRODUCTION_RUNNER', protocolId, methodFamilies, evidenceIds:[], writesPerformed:false };
  }

  const evidenceIds = await resolvePersistedEvidenceIds(candidateEvidenceRefs(input.node, input.reading));
  if (!evidenceIds.length) {
    return { state:'METHOD_LAB_REQUIRED', reason:'PERSISTED_EVIDENCE_IDS_REQUIRED_BEFORE_EXECUTION', protocolId, methodFamilies, evidenceIds:[], writesPerformed:false };
  }

  const fingerprint = sha256({
    contract:SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT,
    nodeId:input.node.nodeId,
    protocolId,
    evidenceIds:[...evidenceIds].sort(),
    methodFamilies:[...methodFamilies].sort(),
    propertyDiscovery:input.reading.propertyDiscovery.candidates,
    relationSignature:input.reading.relations.map((relation) => ({
      edgeId:relation.edgeId,
      currentState:relation.currentState,
      previousState:relation.previousState,
      weightDelta:relation.weightDelta,
      recurrence:relation.recurrence,
    })),
  });
  const receiptEventId = `jr-method-dispatch:${fingerprint}`;
  const db = createServiceSupabaseClient();
  const prior = await db.from('epistemic_events').select('event_id').eq('event_id', receiptEventId).maybeSingle();
  if (prior.data?.event_id) {
    return {
      state:'ALREADY_EXECUTED',
      reason:'IDENTICAL_FIELD_METHOD_DISPATCH_ALREADY_RECORDED',
      protocolId,
      methodFamilies,
      evidenceIds,
      receiptEventId,
      writesPerformed:false,
    };
  }

  const run = await runMethodLabSimulation({
    protocolId: protocolId as 'sociotechnical_simulation'|'economic_simulation',
    evidenceIds,
    actorId: input.actorId,
    parameters: {
      jrFieldDispatch:true,
      fieldNodeId:input.node.nodeId,
      scientificMethodFamilies:methodFamilies,
      propertyCandidates:input.reading.propertyDiscovery.candidates,
      nextObservation:input.reading.methodCompetition.nextObservation,
      trigger:input.trigger,
      dispatchFingerprint:fingerprint,
      authorityBoundary:'SIMULATED_METHOD_LAB_ONLY_NO_CANON_OR_MATERIAL_ACTION',
    },
  });

  const receipt = await appendEpistemicEvent({
    eventId: receiptEventId,
    eventName:'SFI_JR_METHOD_LAB_DISPATCH_COMPLETED',
    epistemicClass:'simulated',
    confidence:1,
    occurredAt:new Date().toISOString(),
    source:{sourceId:input.actorId,sourceType:input.trigger},
    logbookId:`JR_METHOD:${input.node.nodeId}`,
    lineage:[...evidenceIds, run.labAnalysisId],
    payload:{
      contract:SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT,
      fingerprint,
      actorId:input.actorId,
      trigger:input.trigger,
      fieldNodeId:input.node.nodeId,
      protocolId,
      methodFamilies,
      evidenceIds,
      labAnalysisId:run.labAnalysisId,
      labRunId:run.run.labRunId,
      resultHash:run.run.resultHash,
      epistemicClass:'SIMULATED',
      canonicalMutation:false,
      materialPerturbationExecuted:false,
      boundary:'Jr may dispatch only a registered Method Lab simulation using already-persisted evidence. Simulation cannot become observation, canon, governance decision, intervention or RETURN by inheritance.',
    },
  });

  return {
    state:'EXECUTED',
    reason:'REGISTERED_METHOD_LAB_PROTOCOL_EXECUTED_FROM_EVIDENCE_BOUND_FIELD_NEED',
    protocolId,
    methodFamilies,
    evidenceIds,
    labAnalysisId:run.labAnalysisId,
    labRunId:run.run.labRunId,
    resultHash:run.run.resultHash,
    receiptEventId:receipt.ok ? receiptEventId : null,
    writesPerformed:true,
  };
}
