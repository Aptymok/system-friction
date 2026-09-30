import 'server-only';

import { createHash } from 'node:crypto';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runMethodLabSimulation } from '@/lib/method-lab/simulationRun';
import { resolveMethodLabEvidence } from '@/lib/method-lab/persistedEvidenceResolver';
import {
  METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
  type MethodLabExperimentPreregistration,
  type MethodLabExperimentRun,
} from '@/lib/method-lab/experimentContract';
import {
  hashMethodLabPreregistration,
  methodLabPreregistrationId,
  persistMethodLabExperimentPreregistration,
  persistMethodLabExperimentRun,
  readInstitutionalMethodLabExperimentPreregistration,
  readInstitutionalMethodLabExperimentRun,
} from '@/lib/method-lab/experimentPersistence';
import type { FieldProtocolProposal } from '@/lib/method-lab/fieldProjection';
import type { FieldScientificReading } from './fieldScientificReading';

export const SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT = 'SFI-SCIENTIFIC-METHOD-DISPATCH-1.0' as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXECUTABLE_PROTOCOLS = new Set(['sociotechnical_simulation','economic_simulation']);

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function preregistrationEpistemicClass(value: unknown): 'OBSERVED'|'DECLARED'|'DERIVED'|'INFERRED'|'SIMULATED'|'MISSING' {
  const candidate=typeof value==='string'?value.trim().toUpperCase():'MISSING';
  return ['OBSERVED','DECLARED','DERIVED','INFERRED','SIMULATED','MISSING'].includes(candidate)
    ? candidate as 'OBSERVED'|'DECLARED'|'DERIVED'|'INFERRED'|'SIMULATED'|'MISSING'
    : 'MISSING';
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
  | { state:'ALREADY_EXECUTED'; reason:string; protocolId:string; methodFamilies:string[]; evidenceIds:string[]; evidenceEpistemicClasses:Array<{ref:string;epistemicClass:'OBSERVED'|'DECLARED'|'DERIVED'|'INFERRED'|'SIMULATED'|'MISSING'}>; experimentId:string; experimentRunId:string; receiptEventId:string; writesPerformed:false }
  | { state:'EXECUTED'; reason:string; protocolId:string; methodFamilies:string[]; evidenceIds:string[]; experimentId:string; preregistrationAnalysisId:string; experimentAnalysisId:string; labAnalysisId:string; labRunId:string; resultHash:string|null; receiptEventId:string|null; writesPerformed:true };

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
  const resolvedEvidence = await resolveMethodLabEvidence(evidenceIds);
  const evidenceEpistemicClasses = resolvedEvidence.map((item) => ({
    ref:item.id,
    epistemicClass:preregistrationEpistemicClass((item.payload as Record<string, unknown> | null | undefined)?.epistemicClass),
  }));

  const fingerprint = sha256({
    contract:SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT,
    nodeId:input.node.nodeId,
    protocolId,
    evidenceIds:[...evidenceIds].sort(),
    evidenceEpistemicClasses:[...evidenceEpistemicClasses].sort((a,b)=>a.ref.localeCompare(b.ref)),
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
  const experimentId = `jr-field-${fingerprint.slice(0, 24)}`;
  const experimentRunId = `jr-run-${fingerprint.slice(0, 24)}`;
  const db = createServiceSupabaseClient();
  const [priorReceipt, priorFormalRun] = await Promise.all([
    db.from('epistemic_events').select('event_id').eq('event_id', receiptEventId).maybeSingle(),
    readInstitutionalMethodLabExperimentRun(experimentRunId),
  ]);
  if (priorReceipt.data?.event_id || priorFormalRun) {
    return {
      state:'ALREADY_EXECUTED',
      reason:'IDENTICAL_FIELD_METHOD_DISPATCH_ALREADY_RECORDED',
      protocolId,
      methodFamilies,
      evidenceIds,
      evidenceEpistemicClasses,
      experimentId,
      experimentRunId,
      receiptEventId,
      writesPerformed:false,
    };
  }

  const t0 = new Date().toISOString();
  const observableCandidate = input.reading.methodCompetition.candidates.find((candidate) => candidate.assumptionCheck === 'OBSERVABLE') ?? null;
  const nextObservation = input.reading.methodCompetition.nextObservation
    ?? 'Acquire a new evidence-linked field epoch capable of testing the preregistered simulated expectation under the same observation boundary.';
  const expectedMeasures = [...new Set([
    ...input.reading.propertyDiscovery.candidates.map((candidate) => candidate.property),
    ...methodFamilies,
  ])];
  const preregistration: MethodLabExperimentPreregistration = {
    contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    experimentId,
    experimentType: 'SIMULATION',
    METHOD: {
      methodId: `jr-field:${protocolId}`,
      version: SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT,
      description: `Bounded Method Lab simulation selected from field-observed method needs: ${methodFamilies.join(', ')}. This preregistration does not claim that the simulation runner is a formal estimator for each scientific family.`,
    },
    HYPOTHESIS: {
      statement: `Under the current frozen field/evidence state, the registered ${protocolId} simulation will produce a bounded result that can later be contrasted against: ${nextObservation}`,
      nullStatement: 'The later observed field does not provide the preregistered discriminating condition or is incompatible with the simulated result under the same observation boundary.',
    },
    T0: {
      cutoff: t0,
      timezone: 'America/Mexico_City',
      frozenInputRefs: [...evidenceIds],
    },
    POPULATION_SYSTEM: {
      kind: 'SYSTEM',
      ref: input.node.nodeId,
      description: `Canonical field subject ${input.node.label || input.node.nodeId}`,
    },
    INPUTS: evidenceEpistemicClasses.map((item) => ({
      ref:item.ref,
      role:'EVIDENCE' as const,
      epistemicClass:item.epistemicClass,
    })),
    CONTROL: {
      kind: 'NONE',
      description: 'No external control is asserted for this bounded field simulation. T0 evidence and method parameters are frozen for later replay/contrast.',
      inputRefs: [],
    },
    VARIANTS: [{
      variantId: 'registered-simulation',
      description: `Execute the registered ${protocolId} Method Lab protocol once over the frozen T0 evidence.`,
      changes: { protocolId, methodFamilies, jrFieldDispatch:true },
    }],
    EXPECTED_SIGNAL: {
      description: nextObservation,
      measures: expectedMeasures.length ? expectedMeasures : ['FIELD_RELATIONAL_CHANGE'],
    },
    FALSIFICATION: {
      condition: observableCandidate?.falsificationCondition
        ?? 'Later observed evidence fails to preserve or discriminate the field relation/property pattern that motivated this simulation.',
      requiredEvidence: [],
    },
    STOPPING_RULE: {
      condition: `Stop the current inference pass when this condition is materially observed or shown infeasible: ${nextObservation}`,
      maxExecutions: 1,
    },
    RETURN_WINDOW: {
      opensAt: t0,
      closesAt: null,
      required: true,
      basis: 'PHENOMENON_CONDITION',
      condition: nextObservation,
    },
    preregisteredAt: t0,
    preregisteredBy: null,
    canonicalMutation: false,
  };

  const existingPreregistration = await readInstitutionalMethodLabExperimentPreregistration(experimentId);
  const preregPersisted = existingPreregistration
    ? { ok:true as const, analysisId:existingPreregistration.preregistrationRef, definitionHash:existingPreregistration.definitionHash, createdAt:existingPreregistration.createdAt }
    : await persistMethodLabExperimentPreregistration({ preregistration, ownerId:null });
  const preregistrationHash = existingPreregistration?.definitionHash ?? hashMethodLabPreregistration(preregistration);
  const preregistrationRef = methodLabPreregistrationId(experimentId);

  const run = await runMethodLabSimulation({
    protocolId: protocolId as 'sociotechnical_simulation'|'economic_simulation',
    evidenceIds,
    actorId: input.actorId,
    parameters: {
      jrFieldDispatch:true,
      fieldNodeId:input.node.nodeId,
      scientificMethodFamilies:methodFamilies,
      propertyCandidates:input.reading.propertyDiscovery.candidates,
      nextObservation,
      trigger:input.trigger,
      dispatchFingerprint:fingerprint,
      experimentId,
      preregistrationRef,
      authorityBoundary:'SIMULATED_METHOD_LAB_ONLY_NO_CANON_OR_MATERIAL_ACTION',
    },
  });

  const runFinishedAt = run.run.finishedAt;
  const runResultHash = run.run.resultHash;
  if (!runFinishedAt || !runResultHash) throw new Error('METHOD_LAB_SIMULATION_RECEIPT_INCOMPLETE');
  const finishedAt = new Date().toISOString();
  const executorRefs = [...new Set(run.agentResults.map((item) => item.agentId))];
  const experimentRun: MethodLabExperimentRun = {
    contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
    artifacts: {
      PREREGISTERED: {
        preregistrationRef,
        preregistrationHash,
      },
      EXECUTED: {
        runId: experimentRunId,
        experimentId,
        experimentType: 'SIMULATION',
        startedAt: run.run.startedAt,
        finishedAt: runFinishedAt,
        provider: run.run.provider,
        model: run.run.model,
        passportRef: null,
        twinStateRef: null,
        seed: run.run.seed,
      },
      RESULT: {
        epistemicClass: 'SIMULATED',
        payload: {
          executionOwner:'runMethodLabSimulation',
          underlyingLabAnalysisId:run.labAnalysisId,
          underlyingLabRunId:run.run.labRunId,
          protocolId,
          methodFamilies,
          simulations:run.simulations,
          specializedModel:run.specializedModel,
          nextObservation,
          claimBoundary:run.claimBoundary,
        },
        evidenceRefs:[...evidenceIds],
        resultHash:runResultHash,
      },
      CONTRAST: {
        status:'PENDING_RETURN',
        payload:null,
        realityReturn:null,
      },
      LIMITATIONS: [
        ...run.run.limitations,
        'The registered Method Lab protocol is a bounded simulation owner; scientific-family candidacy and descriptive runtime analyses remain distinct from formal statistical validation.',
      ],
      REPRODUCIBILITY_RECEIPT: {
        contractVersion:METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
        codeRef:'src/lib/method-lab/simulationRun.ts#runMethodLabSimulation',
        preregistrationHash,
        inputHash:sha256({fingerprint,evidenceIds,protocolId,methodFamilies,nextObservation}),
        resultHash:runResultHash,
        executorRefs,
        createdAt:finishedAt,
      },
    },
    canonicalMutation:false,
    observationBoundary:'SIMULATION_NEVER_INHERITS_OBSERVED',
  };
  const formalRun = await persistMethodLabExperimentRun({
    preregistration,
    run:experimentRun,
    ownerId:null,
  });

  const receipt = await appendEpistemicEvent({
    returnMode:'receipt',
    eventId: receiptEventId,
    eventName:'SFI_JR_METHOD_LAB_DISPATCH_COMPLETED',
    epistemicClass:'simulated',
    confidence:1,
    occurredAt:new Date().toISOString(),
    source:{sourceId:input.actorId,sourceType:input.trigger},
    logbookId:`JR_METHOD:${input.node.nodeId}`,
    lineage:[...evidenceIds, preregPersisted.analysisId, formalRun.analysisId, run.labAnalysisId],
    payload:{
      contract:SFI_SCIENTIFIC_METHOD_DISPATCH_CONTRACT,
      fingerprint,
      actorId:input.actorId,
      trigger:input.trigger,
      fieldNodeId:input.node.nodeId,
      protocolId,
      methodFamilies,
      evidenceIds,
      experimentId,
      preregistrationAnalysisId:preregPersisted.analysisId,
      experimentAnalysisId:formalRun.analysisId,
      labAnalysisId:run.labAnalysisId,
      labRunId:run.run.labRunId,
      resultHash:runResultHash,
      returnWindow:preregistration.RETURN_WINDOW,
      expectedSignal:preregistration.EXPECTED_SIGNAL,
      falsification:preregistration.FALSIFICATION,
      epistemicClass:'SIMULATED',
      canonicalMutation:false,
      materialPerturbationExecuted:false,
      boundary:'Jr dispatch is formally preregistered before execution. The result remains SIMULATED and PENDING_RETURN until later evidence-linked reality satisfies the preregistered condition and is contrasted without rewriting T0.',
    },
  });

  return {
    state:'EXECUTED',
    reason:'PREREGISTERED_METHOD_LAB_PROTOCOL_EXECUTED_FROM_EVIDENCE_BOUND_FIELD_NEED',
    protocolId,
    methodFamilies,
    evidenceIds,
    experimentId,
    preregistrationAnalysisId:preregPersisted.analysisId,
    experimentAnalysisId:formalRun.analysisId,
    labAnalysisId:run.labAnalysisId,
    labRunId:run.run.labRunId,
    resultHash:runResultHash,
    receiptEventId:receipt.ok ? receiptEventId : null,
    writesPerformed:true,
  };
}