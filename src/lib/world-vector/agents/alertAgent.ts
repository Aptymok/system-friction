import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getWorldVectorStatus } from '../readModel';
import { getWorldVectorPersistenceStatus } from '../persistence';
import type { WorldVectorAgentResult } from './types';

function tableMissing(message: string) {
  return /does not exist|schema cache|not find|relation/i.test(message);
}

export async function runAlertAgent(): Promise<WorldVectorAgentResult> {
  const [status, memory] = await Promise.all([
    getWorldVectorStatus(),
    getWorldVectorPersistenceStatus(),
  ]);
  const warnings = [...status.warnings];
  const blocked: string[] = [];
  let alerts: unknown[] = [];
  let alertTable = 'not_checked';

  if (!status.pulse.latest_snapshot_available) warnings.push('world_vector_latest_snapshot_missing');
  if (status.pulse.sample_count < 3) warnings.push('world_vector_low_sample_count');
  if (!memory.enabled) blocked.push(memory.reason);

  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('world_vector_alerts')
      .select('*')
      .eq('status', 'open')
      .order('detected_at', { ascending: false })
      .limit(10);

    if (error) {
      alertTable = tableMissing(error.message) ? 'missing' : 'read_failed';
      warnings.push(alertTable === 'missing' ? 'world_vector_alerts_table_missing' : `world_vector_alerts_read_failed:${error.message}`);
    } else {
      alertTable = 'available';
      alerts = data ?? [];
    }
  } catch (error) {
    alertTable = 'read_failed';
    warnings.push(error instanceof Error ? `world_vector_alerts_unavailable:${error.message}` : 'world_vector_alerts_unavailable');
  }

  return {
    ok: true,
    agent: 'alertAgent',
    mode: 'read_only',
    memory,
    data: {
      alert_table: alertTable,
      open_alerts: alerts,
      pulse: status.pulse,
    },
    warnings,
    blocked,
  };
}
