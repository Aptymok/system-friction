import { createServiceSupabaseClient } from '../../runtime/supabase/server';

export type GlobalWorldSpectSnapshot = {
  id?: string;
  ihg?: number | null;
  nti?: number | null;
  ldi?: number | null;
  payload?: Record<string, unknown> | null;
  observed_at?: string | null;
  created_at?: string | null;
};

export async function getLatestGlobalWorldSpectSnapshot(): Promise<{
  ok: boolean;
  snapshot: GlobalWorldSpectSnapshot | null;
  error?: string;
}> {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('world_spectrum_snapshots')
      .select('*')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, snapshot: null, error: error.message };
    return { ok: true, snapshot: data || null };
  } catch (error) {
    return {
      ok: false,
      snapshot: null,
      error: error instanceof Error ? error.message : 'worldspect_unavailable',
    };
  }
}

export function nextWorldSpectMeasurementWindow(now = new Date()) {
  const next = new Date(now);
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const first = 1;
  const second = 12 * 60 + 1;
  const nextMinutes = minutes < first ? first : minutes < second ? second : first + 24 * 60;
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCMinutes(nextMinutes);
  return next.toISOString();
}
