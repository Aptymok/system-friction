// src/runtime/layers/Observer.ts
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { GateDecision } from './Gate';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { processEpistemicEvent } from '@/core/memory/institutionalEventPipeline';

export async function recordAction(
  nodeId: string,
  intentId: string,
  planId: string,
  executionResult: any,
  gateDecision: GateDecision
) {
  const supabase = createServiceSupabaseClient();
  // Guardar en la tabla de eventos (ya existente)
  await supabase.from('events').insert({
    node_id: nodeId,
    type: 'audit',
    payload: {
      intent_id: intentId,
      plan_id: planId,
      execution_result: executionResult,
      gate_decision: gateDecision,
    },
    source: 'executor',
  });
  
  // También guardar en tabla específica de decisiones
  await supabase.from('decision_gate_logs').insert({
    plan_id: planId,
    decision_source: gateDecision.source,
    approved: gateDecision.approved,
    justification: gateDecision.justification,
  });

  // NOTA DE MIGRACIÓN (ADR-018): ver systemTick.ts.
  const epistemicEvent = await emitEpistemicEvent({
    eventName: 'runtime.action.recorded',
    logbookId: 'RUNTIME',
    epistemicClass: 'observed',
    schemaVersion: 'adapter.observer.v1',
    sourceId: 'RUNTIME_OBSERVER',
    sourceType: 'runtime',
    actorId: null,
    nodeId,
    confidence: gateDecision.approved ? 0.8 : 0.3,
    payload: { nodeId, intentId, planId, executionResult, gateDecision },
  }).catch(() => null);

  if (epistemicEvent?.ok) {
    await processEpistemicEvent(epistemicEvent.event).catch(() => null);
  }
}

export async function recordObservation(nodeId: string, metricType: string, value: number) {
  const supabase = createServiceSupabaseClient();
  await supabase.from('structured_observations').insert({
    node_id: nodeId,
    observation_type: metricType,
    value,
    unit: '',
    context_json: {},
  });

  // NOTA DE MIGRACIÓN (ADR-018): ver systemTick.ts. La política de memoria
  // (memoryPolicyValidator) decide explícitamente NO promover observaciones
  // crudas de métricas a memoria una por una — pero sí deben quedar en el
  // ledger (epistemic_events), que es lo que hace este adapter.
  const epistemicEvent = await emitEpistemicEvent({
    eventName: 'runtime.observation.recorded',
    logbookId: 'RUNTIME',
    epistemicClass: 'observed',
    schemaVersion: 'adapter.observer.v1',
    sourceId: 'RUNTIME_OBSERVER',
    sourceType: 'runtime',
    actorId: null,
    nodeId,
    confidence: 0.6,
    payload: { nodeId, metricType, value },
  }).catch(() => null);

  if (epistemicEvent?.ok) {
    await processEpistemicEvent(epistemicEvent.event).catch(() => null);
  }
}