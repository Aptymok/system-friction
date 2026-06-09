import { createServiceSupabaseClient } from '@/runtime/supabase/server';

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export async function readScoreFrictionWorldspect(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const snapshot = await service
    .from('worldspect_snapshots')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshot.error) return { ok: true as const, case_id: cleanCaseId, data: null, status: 'worldspect_unavailable', warning: snapshot.error.message };
  return {
    ok: true as const,
    case_id: cleanCaseId,
    data: snapshot.data ?? null,
    status: snapshot.data ? 'worldspect_available' : 'worldspect_unavailable',
  };
}
