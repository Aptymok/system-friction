// src/runtime/layers/Observer.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GateDecision } from './Gate';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

export async function recordAction(
  nodeId: string,
  intentId: string,
  planId: string,
  executionResult: any,
  gateDecision: GateDecision
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const cookieStore = cookies() as any;
  const supabase = createServerClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, { cookies: cookieStore });
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
}

export async function recordObservation(nodeId: string, metricType: string, value: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const cookieStore = cookies() as any;
  const supabase = createServerClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, { cookies: cookieStore });
  await supabase.from('structured_observations').insert({
    node_id: nodeId,
    observation_type: metricType,
    value,
    unit: '',
    context_json: {},
  });
}
