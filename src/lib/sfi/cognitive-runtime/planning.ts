import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { MetaOrchestratorAgent } from './agents/metaOrchestrator';
import type { KernelContext } from './kernelContext';
import type { SfiTaskGraph } from './types';

export async function planCognitiveQuestion(question: string, actorId: string) {
  const taskId = crypto.randomUUID();
  const cycleId = crypto.randomUUID();
  const logbookId = `cognitive-plan:${taskId}`;

  const context: KernelContext = {
    cycleId,
    logbookId,
    taskId,
    currentEvent: 'SFI_TASK_REQUESTED',
    evidence: [],
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: { question },
  };

  const planned = MetaOrchestratorAgent(context);
  const rawGraph = planned.metadata.taskGraph;
  if (!rawGraph || typeof rawGraph !== 'object') {
    return { ok: false as const, error: 'task_graph_not_created', details: null, logbookId, taskId, cycleId };
  }

  const graph = { ...(rawGraph as SfiTaskGraph), question };
  const event = await appendEpistemicEvent({
    eventName: 'SFI_TASK_CREATED',
    epistemicClass: 'derived',
    confidence: 1,
    payload: { actorId, question, taskId, cycleId, taskGraph: graph },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'meta_orchestrator', sourceType: 'cognitive_runtime' },
    logbookId,
    lineage: [],
  });

  if (!event.ok) {
    return { ok: false as const, error: event.error, details: 'details' in event ? event.details ?? null : null, taskGraph: graph, logbookId, taskId, cycleId };
  }

  return {
    ok: true as const,
    taskGraph: { ...graph, status: 'persisted' as const },
    logbookId,
    taskId,
    cycleId,
    event: { eventName: 'SFI_TASK_CREATED', eventId: event.data.event_id, occurredAt: event.data.occurred_at },
  };
}
