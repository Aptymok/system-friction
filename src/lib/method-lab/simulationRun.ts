import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeRegisteredAgent } from '@/lib/sfi/cognitive-runtime/agentExecutionMap';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { METHOD_LAB_CONTRACT_VERSION, assertMethodLabRunEnvelope, type MethodLabProtocolId, type MethodLabRunEnvelope } from './contracts';
import { methodLabProtocol } from './registry';
import { specializedModel } from './specializedModels';
import { materializeMethodLabCognitiveSpineContext } from './cognitiveSpineContext';
import { recordCognitiveTwinExperience } from '@/core/cognitive-twin/experience';

const SIMULATION_PROTOCOL_AGENTS: Partial<Record<MethodLabProtocolId, string[]>> = {
  sociotechnical_simulation: [
    'social_field_simulator',
    'friction_field_simulator',
    'cross_impact',
    'entropy_redistribution',
    'multi_stakeholder_bootstrap',
  ],
  economic_simulation: [
    'economic_field_simulator',
    'cross_impact',
  ],
};

const SPECIALIZED_MODEL_BY_PROTOCOL = {
  sociotechnical_simulation: 'SOCIOTECHNICAL_STATE_MODEL',
  economic_simulation: 'OBSERVABLE_ECONOMIC_STATE_MODEL',
} as const;

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function number01(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}
function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function loadPersistedEvidence(evidenceIds: string[]): Promise<KernelEvidence[]> {
  const db = createServiceSupabaseClient();
  const evidenceRows = await db.from('root_evidence_entries')
    .select('id,title,content,evidence_type,payload,epistemic_event_id,created_at')
    .in('id', evidenceIds);
  if (evidenceRows.error) throw new Error(`METHOD_LAB_EVIDENCE_READ_FAILED:${evidenceRows.error.message}`);
  const persisted = rows(evidenceRows.data);
  if (!persisted.length) throw new Error('METHOD_LAB_PERSISTED_EVIDENCE_NOT_FOUND');

  const eventIds = persisted.map((item) => text(item.epistemic_event_id)).filter((value): value is string => Boolean(value));
  const eventRows = eventIds.length
    ? await db.from('epistemic_events').select('event_id,epistemic_class,confidence,occurred_at').in('event_id', eventIds)
    : { data: [], error: null };
  if (eventRows.error) throw new Error(`METHOD_LAB_EPISTEMIC_EVENT_READ_FAILED:${eventRows.error.message}`);
  const eventMap = new Map(rows(eventRows.data).map((item) => [String(item.event_id), item]));

  return persisted.map((item) => {
    const event = eventMap.get(String(item.epistemic_event_id ?? ''));
    return {
      id: String(item.id),
      source: `root_evidence_entries:${text(item.evidence_type) ?? 'evidence'}`,
      confidence: number01(event?.confidence),
      payload: {
        title: text(item.title),
        content: text(item.content),
        payload: item.payload,
        epistemicClass: text(event?.epistemic_class)?.toUpperCase() ?? 'MISSING',
        observedAt: text(event?.occurred_at) ?? text(item.created_at),
      },
    };
  });
}

export async function runMethodLabSimulation(input: {
  protocolId: 'sociotechnical_simulation' | 'economic_simulation';
  evidenceIds: string[];
  actorId: string;
  parameters?: Record<string, unknown>;
  cognitiveSpineContextRefs?: string[];
}) {
  const definition = methodLabProtocol(input.protocolId);
  if (!definition) throw new Error('METHOD_LAB_PROTOCOL_NOT_REGISTERED');
  const agentIds = SIMULATION_PROTOCOL_AGENTS[input.protocolId] ?? [];
  if (!agentIds.length) throw new Error('METHOD_LAB_PROTOCOL_HAS_NO_EXECUTION_PLAN');

  const modelId = SPECIALIZED_MODEL_BY_PROTOCOL[input.protocolId];
  const modelContract = specializedModel(modelId);
  if (!modelContract || modelContract.parentProtocol !== input.protocolId) {
    throw new Error('METHOD_LAB_SPECIALIZED_MODEL_CONTRACT_MISMATCH');
  }

  const startedAt = new Date().toISOString();
  const labRunId = crypto.randomUUID();
  const evidence = await loadPersistedEvidence(input.evidenceIds);
  const initialEvidenceIds = evidence.map((item) => item.id);
  const cognitiveSpine = await materializeMethodLabCognitiveSpineContext({
    labRunId,
    sourceCutoff: startedAt,
    createdAt: new Date().toISOString(),
    contextRefs: input.cognitiveSpineContextRefs,
  });

  const consumedCognitiveSpineContext = cognitiveSpine.consumed ? {
    contractVersion: cognitiveSpine.contractVersion,
    snapshotId: cognitiveSpine.snapshot.snapshotId,
    snapshotHash: cognitiveSpine.snapshot.snapshotHash,
    sourceCutoff: cognitiveSpine.snapshot.semanticPayload.sourceCutoff,
    projectionProfile: cognitiveSpine.profile,
    profileVersion: cognitiveSpine.profileVersion,
    visibleRefs: cognitiveSpine.visibleRefs,
    twinContext: cognitiveSpine.twinContext,
    rule: 'Cognitive Spine context is protocol-bounded context. It is not appended to Method Lab evidence and cannot upgrade simulation epistemic class.',
  } : null;

  let context: KernelContext = {
    cycleId: labRunId,
    logbookId: `LAB_${input.protocolId}:${labRunId}`,
    taskId: labRunId,
    currentEvent: 'SFI_METHOD_LAB_SIMULATION_REQUESTED',
    evidence: [...evidence],
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {
      methodLab: true,
      protocolId: input.protocolId,
      specializedModel: {
        id: modelContract.id,
        stateVariables: modelContract.stateVariables,
        observables: modelContract.observables,
        perturbations: modelContract.perturbations,
        returnContract: modelContract.returnContract,
        forbiddenClaims: modelContract.forbiddenClaims,
      },
      requestedBy: input.actorId,
      parameters: input.parameters ?? {},
      ...(consumedCognitiveSpineContext ? { cognitiveSpineContext: consumedCognitiveSpineContext } : {}),
      epistemicRule: 'LAB simulation may read persisted evidence and explicitly allowlisted Cognitive Spine context, but contextual state may not be appended to observed evidence or canonical state by inheritance.',
    },
  };

  const agentResults: Array<{ agentId: string; simulationCountBefore: number; simulationCountAfter: number }> = [];
  for (const agentId of agentIds) {
    const evidenceBefore = context.evidence.map((item) => item.id);
    const simulationCountBefore = context.simulations.length;
    context = executeRegisteredAgent(agentId, context);
    const evidenceAfter = context.evidence.map((item) => item.id);
    if (evidenceAfter.length !== evidenceBefore.length || evidenceAfter.some((id, index) => id !== evidenceBefore[index])) {
      throw new Error(`METHOD_LAB_SIMULATION_CONTAMINATED_EVIDENCE:${agentId}`);
    }
    agentResults.push({ agentId, simulationCountBefore, simulationCountAfter: context.simulations.length });
  }

  const finishedAt = new Date().toISOString();
  const resultHash = hash({
    protocolId: input.protocolId,
    specializedModelId: modelContract.id,
    evidenceRefs: initialEvidenceIds,
    parameters: input.parameters ?? {},
    consumedCognitiveSpine: cognitiveSpine.consumed ? {
      snapshotHash: cognitiveSpine.snapshot.snapshotHash,
      visibleRefs: cognitiveSpine.visibleRefs,
    } : null,
    simulations: context.simulations,
    metadata: context.metadata,
  });
  const envelope: MethodLabRunEnvelope = assertMethodLabRunEnvelope({
    contractVersion: METHOD_LAB_CONTRACT_VERSION,
    labRunId,
    protocolId: input.protocolId,
    protocolVersion: definition.version,
    epistemicClass: 'SIMULATED',
    validationLevel: 'SIMULATION',
    datasetHash: hash(initialEvidenceIds),
    parametersHash: hash({
      parameters: input.parameters ?? {},
      cognitiveSpineContextRefs: cognitiveSpine.requestedContextRefs,
    }),
    seed: null,
    codeCommit: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    provider: 'deterministic:sfi-cognitive-runtime',
    model: modelContract.id,
    startedAt,
    finishedAt,
    resultHash,
    evidenceRefs: initialEvidenceIds,
    limitations: [
      'Simulation output is not observed evidence.',
      'Current field simulators are bounded deterministic signal estimators; their indices are not independently calibrated causal measurements.',
      'Cognitive Spine context, when consumed, is protocol-allowlisted context and is not evidence by inheritance.',
      'A later observed return is required before any stronger validation claim.',
    ],
    promotionAllowed: false,
  });

  const db = createServiceSupabaseClient();
  const persisted = await db.from('sfi_lab_analyses').insert({
    mode: input.protocolId,
    source: `root_evidence_entries:${initialEvidenceIds.join(',')}`,
    data_mode: 'SIMULATED',
    systems: [modelContract.id, ...agentIds],
    variables: Array.from(new Set([...modelContract.stateVariables, ...modelContract.observables])),
    limitations: envelope.limitations,
    recommendations: ['Observe the declared return window and compare predicted/simulated signals against later persisted evidence before promotion.'],
    raw_analysis: {
      ...envelope,
      specializedModel: modelContract,
      agentResults,
      simulations: context.simulations,
      metadata: context.metadata,
      cognitiveSpine: {
        contractVersion: cognitiveSpine.contractVersion,
        requestedContextRefs: cognitiveSpine.requestedContextRefs,
        consumed: cognitiveSpine.consumed,
        profile: cognitiveSpine.profile,
        profileVersion: cognitiveSpine.profileVersion,
        snapshot: cognitiveSpine.snapshot,
        consumptionTrace: cognitiveSpine.consumptionTrace,
        visibleRefs: cognitiveSpine.visibleRefs,
        sourcePlane: cognitiveSpine.sourcePlane,
        warnings: cognitiveSpine.warnings,
        rule: cognitiveSpine.rule,
      },
    },
  }).select('id').single();
  if (persisted.error || !persisted.data?.id) throw new Error(`METHOD_LAB_RUN_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);

  const cognitiveTwinExperience = await recordCognitiveTwinExperience({
    memoryKey:`SFI:METHOD_LAB:RUN:${persisted.data.id}`,
    memoryType:'METHOD',
    sourceKind:'sfi_lab_analyses',
    sourceRef:String(persisted.data.id),
    createdBy:input.actorId,
    evidenceRefs:initialEvidenceIds,
    content:{
      epistemicClass:'SIMULATED',
      protocolId:input.protocolId,
      specializedModel:modelContract.id,
      resultHash,
      validationLevel:'SIMULATION',
      simulationCount:context.simulations.length,
      cognitiveSpineSnapshotHash:cognitiveSpine.snapshot.snapshotHash,
      cognitiveSpineConsumed:cognitiveSpine.consumed,
      cognitiveSpineContextRefs:cognitiveSpine.requestedContextRefs,
      limitations:envelope.limitations,
      rule:'Method Lab simulation is available to the Cognitive Twin for comparison and planning but remains SIMULATED until contrasted with observed returns.',
    },
  });

  return {
    ok: true,
    protocol: definition,
    specializedModel: modelContract,
    labAnalysisId: String(persisted.data.id),
    run: envelope,
    agentResults,
    simulations: context.simulations,
    cognitiveSpine: {
      snapshotId: cognitiveSpine.snapshot.snapshotId,
      snapshotHash: cognitiveSpine.snapshot.snapshotHash,
      sourceCutoff: cognitiveSpine.snapshot.semanticPayload.sourceCutoff,
      profile: cognitiveSpine.profile,
      profileVersion: cognitiveSpine.profileVersion,
      requestedContextRefs: cognitiveSpine.requestedContextRefs,
      visibleRefs: cognitiveSpine.visibleRefs,
      consumed: cognitiveSpine.consumed,
      consumptionTrace: cognitiveSpine.consumptionTrace,
    },
    cognitiveTwinExperience,
    claimBoundary: 'This run is SIMULATED. Cognitive Spine context is bounded by explicit protocol allowlist when consumed; neither context nor simulation output is observed evidence, canonical validation, approval or external execution.',
  };
}
