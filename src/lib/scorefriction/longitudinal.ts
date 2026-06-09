import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

export async function createScoreFrictionAttractorSnapshot(input: { proto_attractor_id?: string; case_id?: string }) {
  const service = createServiceSupabaseClient();
  let proto: Row | null = null;

  if (input.proto_attractor_id) {
    const found = await service.from('scorefriction_proto_attractors').select('*').eq('id', input.proto_attractor_id).maybeSingle();
    if (found.error) return { ok: false as const, error: 'proto_attractor_lookup_failed', details: found.error.message };
    proto = record(found.data);
  } else if (input.case_id) {
    const found = await service.from('scorefriction_proto_attractors').select('*').eq('case_id', input.case_id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (found.error) return { ok: false as const, error: 'proto_attractor_lookup_failed', details: found.error.message };
    proto = record(found.data);
  }

  if (!proto?.id) return { ok: true as const, data: null, message: 'sin trayectoria longitudinal' };

  const inserted = await service
    .from('scorefriction_attractor_snapshots')
    .insert({
      proto_attractor_id: proto.id,
      case_id: proto.case_id,
      density: proto.density ?? 0,
      confidence: proto.confidence ?? 0,
      persistence: proto.persistence ?? 0,
      status: proto.status ?? 'latent',
      observation_count: proto.observation_count ?? 0,
      evidence_count: proto.evidence_count ?? 0,
      mihm_snapshot: proto.mihm_snapshot ?? null,
      worldspect_snapshot: proto.worldspect_snapshot ?? null,
    })
    .select('*')
    .single();

  if (inserted.error) return { ok: false as const, error: 'attractor_snapshot_insert_failed', details: inserted.error.message };
  return { ok: true as const, data: inserted.data };
}

export async function listScoreFrictionLongitudinal(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const result = await service
    .from('scorefriction_attractor_snapshots')
    .select('*')
    .eq('case_id', cleanCaseId)
    .order('created_at', { ascending: true });

  if (result.error) return { ok: false as const, error: 'longitudinal_read_failed', details: result.error.message };
  const data = rows(result.data);
  return { ok: true as const, case_id: cleanCaseId, data, message: data.length ? undefined : 'sin trayectoria longitudinal' };
}
