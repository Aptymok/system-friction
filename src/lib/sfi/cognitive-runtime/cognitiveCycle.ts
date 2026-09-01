import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { materializeInstitutionalRuntimeCognitiveSpine } from '@/lib/institution/cognitiveSpineRuntimeMaterializer';
import { resolveUniversalReturnCapability, SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT } from '@/lib/sfi/universalReturnCapabilityResolver';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { KernelContext, KernelEvidence } from './kernelContext';
import { runCognitiveAgent } from './runtimeAgentExecutor';

export const SFI_UNIVERSAL_COGNITIVE_CHECKPOINT = 'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT' as const;
export const SFI_UNIVERSAL_RETURN_PLAN_RECORDED = 'SFI_UNIVERSAL_RETURN_PLAN_RECORDED' as const;

export interface CognitiveCycleResult {
  context: KernelContext;
  executedAgents: string[];
  missingAgents: string[];
  completed: boolean;
}

export interface CognitiveCycleOptions {
  maxAgentsPerInvocation?: number;
  continuationSource?: string;
}

type Row = Record<string, unknown>;

type DurableCheckpoint = {
  eventId: string | null;
  sequence: number;
  context: KernelContext;
  processedAgents: string[];
  executedAgents: string[];
  missingAgents: string[];
  completed: boolean;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

async function ensureCognitiveSpineContext(context: KernelContext, source: string): Promise<KernelContext> {
  const metadata = row(context.metadata);
  if (metadata.cognitiveTwinContext && metadata.cognitiveSpine) return context;

  const createdAt = new Date().toISOString();
  const sourceCutoff = text(metadata.cognitiveSpineSourceCutoff) ?? createdAt;
  try {
    const materialized = await materializeInstitutionalRuntimeCognitiveSpine({
      sourceCutoff,
      executionId: context.cycleId,
      createdAt,
      consume: true,
    });
    return {
      ...context,
      metadata: {
        ...context.metadata,
        cognitiveSpine: materialized.runtimeProjection,
        cognitiveTwinContext: materialized.cognitiveTwinContext,
        cognitiveSpineSourceCutoff: sourceCutoff,
        ctSnapshotConsumed: true,
        ctSnapshotId: materialized.runtimeProjection.snapshotId,
        ctSnapshotHash: materialized.runtimeProjection.snapshotHash,
        aiGovernancePolicyId: 'SFI-AIMS-2026-08',
        authorityBoundary: 'SFI may autonomously observe, analyze, simulate, draft, report internally, propose, acquire authorized evidence and calibrate. Canon mutation, external irreversible action, publication, access grants and authority expansion remain governed.',
        cognitiveSpineWarnings: materialized.warnings,
        cognitiveSpineExecutionSource: source,
      },
    };
  } catch (error) {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        cognitiveSpineSourceCutoff: sourceCutoff,
        ctSnapshotConsumed: false,
        cognitiveSpineWarnings: [
          ...stringList(metadata.cognitiveSpineWarnings),
          `COGNITIVE_SPINE_MATERIALIZATION_DEGRADED:${error instanceof Error ? error.message : String(error)}`,
        ],
        aiGovernancePolicyId: 'SFI-AIMS-2026-08',
        authorityBoundary: 'Cognitive Spine unavailability degrades context but never authorizes evidence fabrication, canon mutation or external irreversible action.',
      },
    };
  }
}

function plannedAgents(context: KernelContext) {
  const plan = context.metadata?.cognitivePlan;
  const required = plan && typeof plan === 'object' && !Array.isArray(plan)
    ? (plan as Record<string, unknown>).requiredAgents
    : null;
  return Array.isArray(required)
    ? required.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function mergeEvidence(base: KernelEvidence[], checkpoint: KernelEvidence[]) {
  const merged = new Map<string, KernelEvidence>();
  for (const item of [...base, ...checkpoint]) {
    if (item && typeof item.id === 'string' && item.id) merged.set(item.id, item);
  }
  return [...merged.values()];
}

function mergeCheckpointContext(base: KernelContext, checkpoint: KernelContext): KernelContext {
  return {
    ...base,
    ...checkpoint,
    cycleId: base.cycleId,
    logbookId: base.logbookId,
    taskId: base.taskId ?? checkpoint.taskId,
    evidence: mergeEvidence(base.evidence ?? [], checkpoint.evidence ?? []),
    hypotheses: checkpoint.hypotheses ?? base.hypotheses,
    contradictions: checkpoint.contradictions ?? base.contradictions,
    simulations: checkpoint.simulations ?? base.simulations,
    predictions: checkpoint.predictions ?? base.predictions,
    risks: checkpoint.risks ?? base.risks,
    opportunities: checkpoint.opportunities ?? base.opportunities,
    metadata: {
      ...base.metadata,
      ...checkpoint.metadata,
      durableContinuation: {
        restored: true,
        restoredAt: new Date().toISOString(),
        rule: 'Continue the same cycle from the latest unfinalized checkpoint; never promote checkpoint state to observed truth.',
      },
    },
  };
}

function checkpointContextProjection(context: KernelContext): KernelContext {
  const signalType = text(context.metadata?.signalType)?.toLowerCase() ?? '';
  const tabular = ['dataset', 'csv'].includes(signalType);
  const evidence = (context.evidence ?? []).map((item) => {
    if (!tabular || item.source !== 'UniversalSignalGateway') return item;
    const payload = row(item.payload);
    if (!('materialContent' in payload)) return item;
    return {
      ...item,
      payload: {
        ...payload,
        materialContent: null,
        materialContentBoundary: 'OMITTED_FROM_DURABLE_CHECKPOINT_RAW_TABULAR_MATERIAL_NOT_PERSISTED',
      },
    };
  });
  const metadata = tabular
    ? {
        ...context.metadata,
        declaredExtraction: null,
        checkpointOmissions: [
          ...stringList(context.metadata?.checkpointOmissions),
          'RAW_TABULAR_MATERIAL',
          'CALLER_DECLARED_EXTRACTION_PAYLOAD',
        ],
      }
    : context.metadata;
  return { ...context, evidence, metadata };
}

async function readLatestUnfinalizedCheckpoint(context: KernelContext): Promise<DurableCheckpoint | null> {
  const db = createServiceSupabaseClient();
  const latest = await db.from('epistemic_events')
    .select('sequence,event_id,payload')
    .eq('event_name', SFI_UNIVERSAL_COGNITIVE_CHECKPOINT)
    .eq('logbook_id', context.logbookId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error || !latest.data) return null;

  const sequence = Number(latest.data.sequence ?? 0);
  const payload = row(latest.data.payload);
  if (text(payload.cycleId) !== context.cycleId) return null;

  const finalized = await db.from('epistemic_events')
    .select('sequence,payload')
    .eq('event_name', 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED')
    .eq('logbook_id', context.logbookId)
    .gt('sequence', sequence)
    .order('sequence', { ascending: false })
    .limit(10);
  const hasCompletedFinalization = !finalized.error && (finalized.data ?? []).some((item) => row(item.payload).completed === true);
  if (hasCompletedFinalization) return null;

  const storedContext = row(payload.context) as unknown as KernelContext;
  if (!storedContext || storedContext.cycleId !== context.cycleId) return null;
  return {
    eventId: text(latest.data.event_id),
    sequence,
    context: storedContext,
    processedAgents: stringList(payload.processedAgents),
    executedAgents: stringList(payload.executedAgents),
    missingAgents: stringList(payload.missingAgents),
    completed: payload.completed === true,
  };
}

function returnPlan(context: KernelContext) {
  const expectedSignals = [...new Set(context.predictions.flatMap((item) => item.expectedSignals ?? []))];
  const contradictionSignals = [...new Set(context.predictions.flatMap((item) => item.contradictionSignals ?? []))];
  const observationWindows = [...new Set(context.predictions.map((item) => item.observationWindow).filter((item): item is string => typeof item === 'string' && item.length > 0))];
  const unresolved = context.metadata?.materialUnresolved ?? null;
  const hasPrediction = context.predictions.length > 0;

  return {
    contract: 'SFI-UNIVERSAL-RETURN-PLAN-1.1',
    cycleId: context.cycleId,
    status: hasPrediction ? 'RETURN_REQUIRED' : 'RETURN_REQUIREMENT_UNDETERMINED',
    acquisitionState: hasPrediction ? 'CAPABILITY_RESOLUTION_REQUIRED' : 'MISSING_DISCRIMINATING_PREDICTION',
    responsibility: 'SFI',
    humanInputRequired: false,
    humanEscalationRule: 'Ask the operator only when the required source, credential, authorization or material observation cannot be obtained through an already-authorized SFI capability.',
    expectedSignals,
    contradictionSignals,
    observationWindows,
    unresolved,
    sourceRequirement: 'Use an authoritative or directly observed source appropriate to the persisted prediction. Do not manufacture RETURN from model output.',
    next: hasPrediction
      ? 'Resolve the minimum governed acquisition capability, obtain the observation, persist RETURN, then CONTRAST.'
      : 'Do not fabricate RETURN. Resolve missing evidence or a discriminating prediction first.',
  };
}

async function persistCheckpoint(input: {
  context: KernelContext;
  processedAgents: string[];
  executedAgents: string[];
  missingAgents: string[];
  completed: boolean;
  source: string;
}) {
  return appendEpistemicEvent({
    eventName: SFI_UNIVERSAL_COGNITIVE_CHECKPOINT,
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.source, sourceType: 'cognitive_runtime_checkpoint' },
    logbookId: input.context.logbookId,
    lineage: [input.context.cycleId],
    payload: {
      cycleId: input.context.cycleId,
      taskId: input.context.taskId ?? null,
      processedAgents: input.processedAgents,
      executedAgents: input.executedAgents,
      missingAgents: input.missingAgents,
      completed: input.completed,
      context: checkpointContextProjection(input.context),
      storagePolicy: 'DURABLE_COGNITIVE_STATE_NO_RAW_SOURCE_ROWS',
      epistemicBoundary: 'Checkpoint persistence preserves execution continuity only. It does not promote derived, inferred or simulated content to observed evidence.',
    },
  });
}

async function persistReturnPlan(context: KernelContext, source: string) {
  const db = createServiceSupabaseClient();
  const latest = await db.from('epistemic_events')
    .select('event_id,payload')
    .eq('event_name', SFI_UNIVERSAL_RETURN_PLAN_RECORDED)
    .eq('logbook_id', context.logbookId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestPayload = latest.data ? row(latest.data.payload) : {};
  const latestTaskId = text(latestPayload.taskId);
  const latestPlan = row(latestPayload.plan);
  const latestCapability = row(latestPlan.capabilityResolution);
  const alreadyAiResolved = text(latestCapability.contract) === SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT;
  if (!latest.error && latestTaskId && latestTaskId === (context.taskId ?? null) && alreadyAiResolved) {
    context.metadata = { ...context.metadata, returnPlan: latestPlan };
    return;
  }

  const basePlan = returnPlan(context);
  let plan: Row = basePlan;
  if (basePlan.acquisitionState === 'CAPABILITY_RESOLUTION_REQUIRED') {
    const capability = await resolveUniversalReturnCapability(basePlan, context);
    plan = {
      ...basePlan,
      acquisitionState: capability.decision,
      responsibility: capability.humanInputRequired ? 'ROOT_OR_AUTHORIZED_OPERATOR' : 'SFI',
      humanInputRequired: capability.humanInputRequired,
      requiredHumanInput: capability.requiredHumanInput,
      capabilityResolution: capability,
      resolvedAt: new Date().toISOString(),
      next: capability.decision === 'SFI_CAN_ACQUIRE'
        ? `Acquire the observation through ${capability.capabilityId}, persist an evidence-linked RETURN, then CONTRAST.`
        : 'Obtain only the minimum source/access/observation listed in requiredHumanInput, persist an evidence-linked RETURN, then CONTRAST.',
    };
  }
  context.metadata = { ...context.metadata, returnPlan: plan };
  const supersededEventId = latest.data ? text(latest.data.event_id) : null;
  await appendEpistemicEvent({
    eventName: SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: source, sourceType: 'ai_governed_return_requirement_resolver' },
    logbookId: context.logbookId,
    lineage: [context.cycleId, supersededEventId].filter((value): value is string => Boolean(value)),
    payload: {
      cycleId: context.cycleId,
      taskId: context.taskId ?? null,
      plan,
      supersedesReturnPlanEventId: supersededEventId,
      canonicalPromotionAllowed: false,
      epistemicBoundary: 'AI capability resolution allocates execution responsibility only. It cannot create RETURN, evidence acceptance, CONTRAST, closure, learning or canon.',
    },
  });
}

export async function executeCognitiveCycle(
  context: KernelContext,
  options: CognitiveCycleOptions = {},
): Promise<CognitiveCycleResult> {
  const source = options.continuationSource ?? 'sfi_cognitive_runtime';
  const checkpoint = await readLatestUnfinalizedCheckpoint(context);
  let currentContext = checkpoint ? mergeCheckpointContext(context, checkpoint.context) : context;
  currentContext = await ensureCognitiveSpineContext(currentContext, source);
  const executedAgents: string[] = checkpoint ? [...checkpoint.executedAgents] : [];
  const processedAgents = new Set<string>(checkpoint?.processedAgents ?? []);

  if (checkpoint?.completed) {
    const missingAgents = plannedAgents(currentContext).filter((agentId) => !executedAgents.includes(agentId));
    await persistReturnPlan(currentContext, source);
    return { context: currentContext, executedAgents, missingAgents, completed: missingAgents.length === 0 && executedAgents.includes('meta_orchestrator') };
  }

  const queue: string[] = processedAgents.has('meta_orchestrator')
    ? stringList(currentContext.metadata?.cognitivePlan && typeof currentContext.metadata.cognitivePlan === 'object'
        ? (currentContext.metadata.cognitivePlan as Record<string, unknown>).executionOrder
        : null)
    : ['meta_orchestrator'];
  let processedThisInvocation = 0;
  const continuationConfig = row(row(currentContext.metadata?.caseContext).durableContinuation);
  const configuredBudget = Number(continuationConfig.maxAgentsPerInvocation);
  const defaultBudget = Number.isFinite(configuredBudget) && configuredBudget > 0 ? configuredBudget : 25;
  const maxAgents = Math.max(1, Math.min(25, options.maxAgentsPerInvocation ?? defaultBudget));

  while (queue.length > 0 && processedThisInvocation < maxAgents) {
    const agentId = queue.shift()!;
    if (processedAgents.has(agentId)) continue;
    processedAgents.add(agentId);
    processedThisInvocation += 1;

    const result = await runCognitiveAgent(agentId, currentContext);
    currentContext = result.context;
    if (result.executed && !executedAgents.includes(agentId)) executedAgents.push(agentId);

    const executionOrder = currentContext.metadata?.cognitivePlan?.executionOrder;
    if (Array.isArray(executionOrder)) {
      for (const nextAgent of executionOrder) {
        if (typeof nextAgent === 'string' && !processedAgents.has(nextAgent) && !queue.includes(nextAgent)) queue.push(nextAgent);
      }
    }

    const requiredNow = plannedAgents(currentContext);
    const missingNow = requiredNow.filter((id) => !executedAgents.includes(id));
    await persistCheckpoint({
      context: currentContext,
      processedAgents: [...processedAgents],
      executedAgents,
      missingAgents: missingNow,
      completed: false,
      source,
    });
  }

  const requiredAgents = plannedAgents(currentContext);
  const missingAgents = requiredAgents.filter((agentId) => !executedAgents.includes(agentId));
  const metaExecuted = executedAgents.includes('meta_orchestrator');
  const queueExhausted = queue.length === 0;
  const completed = metaExecuted && missingAgents.length === 0 && queueExhausted;
  const paused = !completed && !queueExhausted && processedThisInvocation >= maxAgents;
  const taskGraph = currentContext.metadata?.taskGraph;

  if (completed) {
    currentContext.metadata = { ...currentContext.metadata, returnPlan: returnPlan(currentContext) };
  }
  currentContext.metadata = {
    ...currentContext.metadata,
    taskGraph: taskGraph && typeof taskGraph === 'object' && !Array.isArray(taskGraph)
      ? { ...taskGraph, status: completed ? 'completed' : paused ? 'paused' : 'degraded' }
      : undefined,
    taskGraphExecution: {
      status: completed ? 'completed' : paused ? 'paused' : 'degraded',
      executedAgents,
      missingAgents,
      processedAgents: [...processedAgents],
      checkpointed: true,
      completedAt: completed ? new Date().toISOString() : null,
    },
    cognitiveCycle: {
      completed,
      paused,
      executedAgents,
      missingAgents,
      processedAgents: [...processedAgents],
      finishedAt: new Date().toISOString(),
    },
  };

  await persistCheckpoint({
    context: currentContext,
    processedAgents: [...processedAgents],
    executedAgents,
    missingAgents,
    completed,
    source,
  });
  if (completed) await persistReturnPlan(currentContext, source);

  return { context: currentContext, executedAgents, missingAgents, completed };
}
