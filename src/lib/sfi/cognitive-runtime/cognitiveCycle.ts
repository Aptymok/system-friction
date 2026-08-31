import { appendEpistemicEvent } from '@/lib/events/eventStore';
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
    .select('sequence')
    .eq('event_name', 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED')
    .eq('logbook_id', context.logbookId)
    .gt('sequence', sequence)
    .order('sequence', { ascending: false })
    .limit(1);
  if (!finalized.error && (finalized.data?.length ?? 0) > 0) return null;

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
    contract: 'SFI-UNIVERSAL-RETURN-PLAN-1.0',
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
      context: input.context,
      storagePolicy: 'DURABLE_COGNITIVE_STATE_NO_RAW_SOURCE_ROWS',
      epistemicBoundary: 'Checkpoint persistence preserves execution continuity only. It does not promote derived, inferred or simulated content to observed evidence.',
    },
  });
}

async function persistReturnPlan(context: KernelContext, source: string) {
  const db = createServiceSupabaseClient();
  const latest = await db.from('epistemic_events')
    .select('payload')
    .eq('event_name', SFI_UNIVERSAL_RETURN_PLAN_RECORDED)
    .eq('logbook_id', context.logbookId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestTaskId = latest.data ? text(row(latest.data.payload).taskId) : null;
  if (!latest.error && latestTaskId && latestTaskId === (context.taskId ?? null)) return;

  const plan = returnPlan(context);
  context.metadata = { ...context.metadata, returnPlan: plan };
  await appendEpistemicEvent({
    eventName: SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: source, sourceType: 'return_requirement_resolver' },
    logbookId: context.logbookId,
    lineage: [context.cycleId],
    payload: {
      cycleId: context.cycleId,
      taskId: context.taskId ?? null,
      plan,
      canonicalPromotionAllowed: false,
    },
  });
}

export async function executeCognitiveCycle(
  context: KernelContext,
  options: CognitiveCycleOptions = {},
): Promise<CognitiveCycleResult> {
  const checkpoint = await readLatestUnfinalizedCheckpoint(context);
  let currentContext = checkpoint ? mergeCheckpointContext(context, checkpoint.context) : context;
  const executedAgents: string[] = checkpoint ? [...checkpoint.executedAgents] : [];
  const processedAgents = new Set<string>(checkpoint?.processedAgents ?? []);
  const source = options.continuationSource ?? 'sfi_cognitive_runtime';

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
  const maxAgents = Math.max(1, Math.min(25, options.maxAgentsPerInvocation ?? 25));

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
