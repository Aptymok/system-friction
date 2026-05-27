import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiKernelCycleRecord } from '../../../packages/sfi-kernel/src';

export type KernelCycleRow = {
  id: string;
  cycle_id: string;
  epistemic_event_id: string | null;
  worldspect_snapshot_id: string | null;
  observed_at: string;
  source_state: 'observed' | 'degraded' | 'missing';
  status: 'committed' | 'degraded' | 'blocked';
  confidence: number;
  graph_node_count: number;
  graph_edge_count: number;
  campo: unknown;
  mihm: unknown;
  delta: unknown;
  policy: unknown;
  created_at: string;
};

export async function persistKernelCycle(record: SfiKernelCycleRecord) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('kernel_cycles')
    .insert({
      cycle_id: record.cycleId,
      epistemic_event_id: record.epistemicEventId ?? null,
      worldspect_snapshot_id: record.worldspectSnapshotId,
      observed_at: record.observedAt,
      source_state: record.sourceState,
      status: record.status,
      confidence: record.confidence,
      graph_node_count: record.graphNodeCount,
      graph_edge_count: record.graphEdgeCount,
      campo: record.campo,
      mihm: record.mihm,
      delta: record.delta,
      policy: record.policy,
    })
    .select('*')
    .single();

  if (error) {
    return { ok: false as const, error: 'kernel_cycle_persist_failed', details: error.message };
  }

  return { ok: true as const, data: data as KernelCycleRow };
}

export async function getLatestKernelCycle() {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('kernel_cycles')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as KernelCycleRow;
}
