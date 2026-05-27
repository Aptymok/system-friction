import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiKernelCycleRecord } from '../../../packages/sfi-kernel/src';

export type KernelCycleRow = {
  id: string;
  worldspect_snapshot_id: string | null;
  event_id: string | null;
  status: 'committed' | 'degraded' | 'blocked';
  campo_state: unknown;
  mihm_state: unknown;
  delta_state: unknown;
  policy_state: unknown;
  created_at: string;
};

export async function persistKernelCycle(record: SfiKernelCycleRecord) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('kernel_cycles')
    .insert({
      worldspect_snapshot_id: record.worldspectSnapshotId,
      event_id: record.epistemicEventId ?? null,
      status: record.status,
      campo_state: {
        cycleId: record.cycleId,
        observedAt: record.observedAt,
        sourceState: record.sourceState,
        confidence: record.confidence,
        graphNodeCount: record.graphNodeCount,
        graphEdgeCount: record.graphEdgeCount,
        campo: record.campo,
      },
      mihm_state: record.mihm,
      delta_state: record.delta,
      policy_state: record.policy,
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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as KernelCycleRow;
}
