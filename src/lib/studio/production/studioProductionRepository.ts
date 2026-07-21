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

export async function listStudioSessions(): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return { ok: true, data: Array.isArray(data) ? data as Row[] : [] };
  } catch (error) {
    return errorResult(error, 'studio_sessions_unavailable');
  }
}

export async function createStudioSession(input: { title?: string | null }): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .insert({ title: asString(input.title) ?? 'Studio session', status: 'active' })
      .select('*')
      .single();
    if (error) throw error;
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_session_create_unavailable');
  }
}

export async function getStudioSession(id: string): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('studio_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, status: 404, error: 'studio_session_not_found' };
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_session_unavailable');
  }
}

export async function getStudioObject(id: string): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('studio_objects').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, status: 404, error: 'studio_object_not_found' };
    return { ok: true, data: data as Row };
  } catch (error) {
    return errorResult(error, 'studio_object_unavailable');
  }
}

export async function listStudioObjects(sessionId?: string | null): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    let query = supabase.from('studio_objects').select('*').order('updated_at', { ascending: false }).limit(80);
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw error;
    return { ok: true, data: Array.isArray(data) ? data as Row[] : [] };
  } catch (error) {
    return errorResult(error, 'studio_objects_unavailable');
  }
}

export async function getStudioObjectFeatures(id: string): Promise<StudioRepositoryResult<{ object: Row; features: Row[] }>> {
  const object = await getStudioObject(id);
  if (!object.ok) return object;
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('studio_object_features').select('*').eq('object_id', id);
    if (error) throw error;
    return { ok: true, data: { object: object.data, features: Array.isArray(data) ? data as Row[] : [] } };
  } catch (error) {
    return errorResult(error, 'studio_object_features_unavailable');
  }
}

export async function createStudioUploadObject(input: {
  sessionId?: string | null;
  title: string;
  objectType: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath?: string | null;
}): Promise<StudioRepositoryResult<Row>> {
  try {
    const supabase = createServiceSupabaseClient();
    const sessionId = asString(input.sessionId);
    const session = sessionId
      ? { id: sessionId }
      : (await createStudioSession({ title: `${input.title} session` }));
    const nextSessionId = 'ok' in session && session.ok === false ? null : (session as { id?: string; data?: Row }).id ?? asString((session as { data?: Row }).data?.id);
    if (!nextSessionId) return { ok: false, status: 503, error: 'studio_session_required' };

    const { data, error } = await supabase
      .from('studio_objects')
      .insert({
        session_id: nextSessionId,
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

export async function recordStudioAnalysisBlocked(objectId: string, reason: string): Promise<StudioRepositoryResult<Row>> {
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

export async function listStudioArchive(): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('studio_archive_events').select('*').order('created_at', { ascending: false }).limit(80);
    if (error) throw error;
    return { ok: true, data: Array.isArray(data) ? data as Row[] : [] };
  } catch (error) {
    return errorResult(error, 'studio_archive_unavailable');
  }
}

export async function listStudioDeliverables(): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.from('studio_exports').select('*').order('created_at', { ascending: false }).limit(80);
    if (error) throw error;
    return { ok: true, data: Array.isArray(data) ? data as Row[] : [] };
  } catch (error) {
    return errorResult(error, 'studio_deliverables_unavailable');
  }
}

/**
 * Historial longitudinal de análisis de audio de un objeto (una fila por
 * cada vez que se analizó/re-analizó — ediciones sucesivas). Aditivo: no
 * modifica ninguna función existente ni la tabla studio_audio_features.
 */
export async function listStudioAudioFeaturesHistory(objectId: string): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('studio_audio_features')
      .select('id, object_id, rms, peak, clipping_risk, dynamic_range, lufs, spectral_centroid, created_at')
      .eq('object_id', objectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { ok: true, data: Array.isArray(data) ? (data as Row[]) : [] };
  } catch (error) {
    return errorResult(error, 'studio_audio_features_history_unavailable');
  }
}