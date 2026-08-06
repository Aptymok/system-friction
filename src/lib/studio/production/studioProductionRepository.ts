import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type StudioRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; details?: string };

type Row = Record<string, unknown>;

function errorResult(error: unknown, fallback: string): StudioRepositoryResult<never> {
  const message = error instanceof Error ? error.message : fallback;
  return { ok: false, status: 503, error: fallback, details: message };
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function newestFirst(a: Row, b: Row) {
  return String(b.created_at ?? b.updated_at ?? '').localeCompare(String(a.created_at ?? a.updated_at ?? ''));
}

async function ownedSessionIds(ownerId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from('studio_sessions').select('id').eq('owner_id', ownerId);
  if (error) throw error;
  return rows(data).map((item) => asString(item.id)).filter((item): item is string => Boolean(item));
}

async function ownedObjectIds(ownerId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from('studio_objects').select('id').eq('owner_id', ownerId);
  if (error) throw error;
  return rows(data).map((item) => asString(item.id)).filter((item): item is string => Boolean(item));
}

export async function listStudioSessions(ownerId: string): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return { ok: true, data: rows(data) };
  } catch (error) {
    return errorResult(error, 'studio_sessions_unavailable');
  }
}

export async function createStudioSession(input: { ownerId: string; title?: string | null }): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .insert({ owner_id: input.ownerId, title: asString(input.title) ?? 'Studio session', status: 'active' })
      .select('*')
      .single();
    if (error) throw error;
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_session_create_unavailable');
  }
}

export async function getStudioSession(id: string, ownerId: string): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, status: 404, error: 'studio_session_not_found' };
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_session_unavailable');
  }
}

export async function getStudioObject(id: string, ownerId: string): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_objects')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, status: 404, error: 'studio_object_not_found' };
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_object_unavailable');
  }
}

export async function listStudioObjects(ownerId: string, sessionId?: string | null): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    let query = supabase
      .from('studio_objects')
      .select('*')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(80);
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw error;
    return { ok: true, data: rows(data) };
  } catch (error) {
    return errorResult(error, 'studio_objects_unavailable');
  }
}

export async function getStudioObjectFeatures(id: string, ownerId: string): Promise<StudioRepositoryResult<{ object: Row; features: Row[] }>> {
  const object = await getStudioObject(id, ownerId);
  if (!object.ok) return object;
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('studio_object_features').select('*').eq('object_id', id);
    if (error) throw error;
    return { ok: true, data: { object: object.data, features: rows(data) } };
  } catch (error) {
    return errorResult(error, 'studio_object_features_unavailable');
  }
}

export async function createStudioUploadObject(input: {
  ownerId: string;
  sessionId?: string | null;
  title: string;
  objectType: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath?: string | null;
}): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const requestedSessionId = asString(input.sessionId);
    let sessionId: string | null = null;

    if (requestedSessionId) {
      const session = await getStudioSession(requestedSessionId, input.ownerId);
      if (!session.ok) return session;
      sessionId = requestedSessionId;
    } else {
      const session = await createStudioSession({ ownerId: input.ownerId, title: `${input.title} session` });
      if (!session.ok) return session;
      sessionId = asString(session.data.id);
    }

    if (!sessionId) return { ok: false, status: 503, error: 'studio_session_required' };

    const { data, error } = await supabase
      .from('studio_objects')
      .insert({
        owner_id: input.ownerId,
        session_id: sessionId,
        title: input.title,
        object_type: input.objectType,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        source_uri: input.storagePath,
        status: 'uploaded',
      })
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('studio_uploads').insert({
      owner_id: input.ownerId,
      object_id: (data as Row).id,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      status: 'stored',
    });

    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_object_upload_unavailable');
  }
}

export async function recordStudioAnalysisBlocked(objectId: string, ownerId: string, reason: string): Promise<StudioRepositoryResult<Row>> {
  const object = await getStudioObject(objectId, ownerId);
  if (!object.ok) return object;
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_analysis_jobs')
      .insert({ object_id: objectId, status: 'blocked', reason })
      .select('*')
      .single();
    if (error) throw error;
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_analysis_jobs_unavailable');
  }
}

export async function listStudioArchive(ownerId: string): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const [objectIds, sessionIds] = await Promise.all([ownedObjectIds(ownerId), ownedSessionIds(ownerId)]);
    if (!objectIds.length && !sessionIds.length) return { ok: true, data: [] };

    const queries: Array<PromiseLike<{ data: unknown; error: unknown }>> = [];
    if (objectIds.length) {
      queries.push(supabase.from('studio_archive_events').select('*').in('object_id', objectIds).order('created_at', { ascending: false }).limit(80));
    }
    if (sessionIds.length) {
      queries.push(supabase.from('studio_archive_events').select('*').in('session_id', sessionIds).order('created_at', { ascending: false }).limit(80));
    }

    const results = await Promise.all(queries);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    const unique = new Map<string, Row>();
    results.flatMap((result) => rows(result.data)).forEach((item) => unique.set(String(item.id), item));
    return { ok: true, data: [...unique.values()].sort(newestFirst).slice(0, 80) };
  } catch (error) {
    return errorResult(error, 'studio_archive_unavailable');
  }
}

export async function listStudioDeliverables(ownerId: string): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const objectIds = await ownedObjectIds(ownerId);
    if (!objectIds.length) return { ok: true, data: [] };
    const { data, error } = await supabase
      .from('studio_exports')
      .select('*')
      .in('object_id', objectIds)
      .order('created_at', { ascending: false })
      .limit(80);
    if (error) throw error;
    return { ok: true, data: rows(data) };
  } catch (error) {
    return errorResult(error, 'studio_deliverables_unavailable');
  }
}

export async function listStudioAudioFeaturesHistory(objectId: string, ownerId: string): Promise<StudioRepositoryResult<Row[]>> {
  const object = await getStudioObject(objectId, ownerId);
  if (!object.ok) return object;
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_audio_features')
      .select('id, object_id, rms, peak, clipping_risk, dynamic_range, lufs, spectral_centroid, created_at')
      .eq('object_id', objectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { ok: true, data: rows(data) };
  } catch (error) {
    return errorResult(error, 'studio_audio_features_history_unavailable');
  }
}
