import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { listStudioObjects, listStudioSessions, type StudioRepositoryResult } from '@/lib/studio/production/studioProductionRepository';

export const SFI_STUDIO_OWNER_CONTEXT_CONTRACT = 'SFI-STUDIO-OWNER-CONTEXT-1.0' as const;

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function boundedLimit(value: number | undefined, fallback = 100) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(200, Math.floor(value ?? fallback)));
}

function failure(error: unknown, code: string): StudioRepositoryResult<never> {
  return { ok: false, status: 503, error: code, details: error instanceof Error ? error.message : String(error) };
}

export async function listOwnerStudioEvidenceTraces(ownerId: string, limit = 100): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const service = createServiceSupabaseClient();
    const result = await service
      .from('studio_evidence_traces')
      .select('id,object_id,source,label,payload,created_at,owner_id')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(boundedLimit(limit));
    if (result.error) throw result.error;
    return { ok: true, data: rows(result.data) };
  } catch (error) {
    return failure(error, 'studio_owner_evidence_unavailable');
  }
}

export async function listOwnerStudioArchiveEvents(ownerId: string, limit = 100): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const service = createServiceSupabaseClient();
    const result = await service
      .from('studio_archive_events')
      .select('id,session_id,object_id,event_type,label,source,payload,created_at,owner_id')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(boundedLimit(limit));
    if (result.error) throw result.error;
    return { ok: true, data: rows(result.data) };
  } catch (error) {
    return failure(error, 'studio_owner_archive_unavailable');
  }
}

export async function listOwnerStudioAmvMemory(ownerId: string, limit = 100): Promise<StudioRepositoryResult<Row[]>> {
  try {
    const service = createServiceSupabaseClient();
    // sfi_amv_memory predates owner_id. Restored owner-scoped memories carry the
    // authenticated owner UUID inside memory_delta.raw.ownerId. Filter at the
    // database boundary; never service-read all AMV rows and filter in model context.
    const result = await service
      .from('sfi_amv_memory')
      .select('id,session_id,module,input_summary,output_summary,memory_delta,uncertainty,source_trust,requires_human_validation,created_at')
      .eq('memory_delta->raw->>ownerId', ownerId)
      .order('created_at', { ascending: false })
      .limit(boundedLimit(limit));
    if (result.error) throw result.error;
    return { ok: true, data: rows(result.data) };
  } catch (error) {
    return failure(error, 'studio_owner_memory_unavailable');
  }
}

export async function readOwnerStudioContext(ownerId: string, limit = 100): Promise<StudioRepositoryResult<{
  contract: typeof SFI_STUDIO_OWNER_CONTEXT_CONTRACT;
  ownerId: string;
  sessions: Row[];
  objects: Row[];
  evidenceTraces: Row[];
  archiveEvents: Row[];
  amvMemory: Row[];
  counts: { sessions: number; objects: number; evidenceTraces: number; archiveEvents: number; amvMemory: number };
  boundaries: Record<string, unknown>;
}>> {
  try {
    const [sessions, objects, evidenceTraces, archiveEvents, amvMemory] = await Promise.all([
      listStudioSessions(ownerId),
      listStudioObjects(ownerId, { includeArchived: true, limit: boundedLimit(limit) }),
      listOwnerStudioEvidenceTraces(ownerId, limit),
      listOwnerStudioArchiveEvents(ownerId, limit),
      listOwnerStudioAmvMemory(ownerId, limit),
    ]);

    const results = [sessions, objects, evidenceTraces, archiveEvents, amvMemory];
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) return failed;

    const sessionRows = sessions.ok ? sessions.data : [];
    const objectRows = objects.ok ? objects.data : [];
    const evidenceRows = evidenceTraces.ok ? evidenceTraces.data : [];
    const archiveRows = archiveEvents.ok ? archiveEvents.data : [];
    const memoryRows = amvMemory.ok ? amvMemory.data : [];

    return {
      ok: true,
      data: {
        contract: SFI_STUDIO_OWNER_CONTEXT_CONTRACT,
        ownerId,
        sessions: sessionRows,
        objects: objectRows,
        evidenceTraces: evidenceRows,
        archiveEvents: archiveRows,
        amvMemory: memoryRows,
        counts: {
          sessions: sessionRows.length,
          objects: objectRows.length,
          evidenceTraces: evidenceRows.length,
          archiveEvents: archiveRows.length,
          amvMemory: memoryRows.length,
        },
        boundaries: {
          ownerSource: 'oauth.subjectId',
          studioOwnerPredicate: 'owner_id = oauth.subjectId',
          amvOwnerPredicate: 'memory_delta.raw.ownerId = oauth.subjectId',
          binaryContentIncluded: false,
          rootEvidenceIncluded: false,
          institutionalCanonIncluded: false,
          authorityExpansion: false,
          restoredMetadataIsNotBinaryMaterialization: true,
        },
      },
    };
  } catch (error) {
    return failure(error, 'studio_owner_context_unavailable');
  }
}
