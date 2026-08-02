// src/runtime/kernel/systemTick.ts
import { createServerSupabaseClient } from '@/runtime/supabase/server';
import { getActiveIntent } from '../layers/IntentLayer';
import { generatePlans } from '../layers/Planner';
import { simulatePlan } from '../layers/Simulator';
import { evaluatePlan } from '../layers/Gate';
import { executePlan } from '../layers/Executor';
import { recordAction, recordObservation } from '../layers/Observer';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { processEpistemicEvent } from '@/core/memory/institutionalEventPipeline';

export async function systemTick(metrics: any, executor: any) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: 'error', message: 'Supabase no disponible' };

  // Verificar acceso a módulos según suscripción
  const { data: profile } = await supabase
    .from('profiles')
    .select('module_access')
    .eq('user_id', metrics.userId)
    .single();
  const modules = profile?.module_access || {};
  if (modules.planner !== true) {
    return { status: 'access_denied', message: 'Módulo de planificación no activado' };
  }

  // 1. Obtener intención activa
  const intent = await getActiveIntent(metrics.nodeId);
  if (!intent) {
    return { status: 'no_intent', message: 'No hay intención activa. Define un objetivo en la capa de intención.' };
  }

  // 2. Generar planes (cada plan debe tener al menos un campo 'label' único)
  const plans = await generatePlans(intent, metrics);

  // 3. Simular cada plan y evaluar el Gate (ya incluye ERW y umbral dinámico)
  const planResults = [];
  for (const plan of plans) {
    const sim = await simulatePlan(plan, intent, [metrics], 1000);
    const gate = await evaluatePlan(plan, sim, metrics.nodeId, metrics.userId);
    planResults.push({ plan, simulation: sim, gate });
  }

  // 4. Seleccionar el primer plan aprobado (el Gate decide con umbral dinámico)
  const approved = planResults.find(r => r.gate.approved === true);
  if (!approved) {
    return {
      status: 'no_approved_plan',
      plans: planResults.map(p => ({ label: p.plan.label, gate: p.gate }))
    };
  }

  // 5. Registrar la decisión del Gate (incluye el ERW usado y el umbral dinámico)
  const { plan, gate } = approved;
  await supabase.from('decision_gate_logs').insert({
    user_id: metrics.userId,
    node_id: metrics.nodeId,
    plan_id: plan.label,                     // o podrías usar plan.id si existe
    decision_source: gate.source,
    approved: gate.approved,
    justification: gate.justification,
    metadata: {
      erw_used: gate.erwUsed,
      dynamic_threshold: gate.dynamicThreshold,
      simulation_score: approved.simulation.successProbability
    }
  });

  // NOTA DE MIGRACIÓN (ADR-018): systemTick no está conectado a ninguna ruta
  // real hoy (ver MIGRATION_DEPENDENCY_GRAPH.md — cero importadores). Este
  // adapter existe SOLO durante la migración: legacy writer → adapter →
  // epistemic_event. El insert directo a `decision_gate_logs` de arriba debe
  // eliminarse cuando se decida si esta cadena se reconecta o se retira.
  const epistemicEvent = await emitEpistemicEvent({
    eventName: 'runtime.decision_gate.recorded',
    logbookId: 'RUNTIME',
    epistemicClass: 'observed',
    schemaVersion: 'adapter.systemTick.v1',
    sourceId: 'RUNTIME_KERNEL',
    sourceType: 'runtime',
    actorId: metrics.userId ?? null,
    nodeId: metrics.nodeId ?? null,
    confidence: gate.approved ? 0.8 : 0.3,
    payload: { userId: metrics.userId, nodeId: metrics.nodeId, planId: plan.label, gate },
  }).catch(() => null);

  if (epistemicEvent?.ok) {
    await processEpistemicEvent(epistemicEvent.event).catch(() => null);
  }

  // 6. Ejecutar el plan (literal, sin reinterpretación)
  const executionResult = await executePlan(plan, { metrics, intent });

  // 7. Registrar observación (resultado real, gap)
  await recordAction(metrics.nodeId, intent.id, plan.label, executionResult, gate);
  await recordObservation(metrics.nodeId, 'ihg', metrics.ihg);
  await recordObservation(metrics.nodeId, 'nti', metrics.nti);

  return {
    status: 'tick_ok',
    executedPlan: plan.label,
    executionResult,
    gate
  };
}