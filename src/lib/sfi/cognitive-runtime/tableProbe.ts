import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type TableProbe = {
  table: string;
  ok: boolean;
  count: number | null;
  observedAt: string | null;
  warning: string | null;
};

export async function probeTable(table: string): Promise<TableProbe> {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service.from(table).select('*').limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
    const observedAt = typeof row?.updated_at === 'string'
      ? row.updated_at
      : typeof row?.observed_at === 'string'
        ? row.observed_at
        : typeof row?.created_at === 'string'
          ? row.created_at
          : null;
    return { table, ok: true, count: Array.isArray(data) ? data.length : 0, observedAt, warning: null };
  } catch (error) {
    return {
      table,
      ok: false,
      count: null,
      observedAt: null,
      warning: error instanceof Error ? error.message : 'table_probe_failed',
    };
  }
}

