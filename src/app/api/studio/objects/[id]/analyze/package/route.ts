import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { createStudioContentSignedUrl, STUDIO_OBJECT_BUCKET } from '@/lib/studio/multimodal/storage';
import { analyzeStudioSessionPackage } from '@/lib/studio/multimodal/sessionPackageAnalyzer';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ENGINE = 'studio_session_package:zip_range_v1';
const ENGINE_VERSION = '2026-08-09.1';

type RouteContext = { params: Promise<{ id: string }> };
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function feature(input: {
  objectId: string;
  key: string;
  label: string;
  numeric?: number | null;
  text?: string | null;
  unit?: string | null;
  confidence?: number;
  explanation: string;
  payload?: Record<string, unknown>;
}) {
  return {
    object_id: input.objectId,
    feature_key: input.key,
    label: input.label,
    numeric_value: input.numeric ?? null,
    text_value: input.text ?? null,
    unit: input.unit ?? null,
    source: ENGINE,
    confidence: input.confidence ?? 1,
    payload: {
      status: input.numeric !== undefined || input.text ? 'OBSERVED' : 'DERIVED',
      explanation: input.explanation,
      engineVersion: ENGINE_VERSION,
      ...(input.payload ?? {}),
    },
  };
}

export async function POST(_request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    const access = await requireObjectOwner(objectId);
    const db = createServiceSupabaseClient();
    const [objectResult, uploadResult] = await Promise.all([
      db.from('studio_objects').select('*').eq('id', objectId).maybeSingle(),
      db.from('studio_uploads').select('*').eq('object_id', objectId).eq('status', 'stored').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (objectResult.error || !objectResult.data) throw new StudioMultimodalError('OBJECT_NOT_FOUND', objectResult.error?.message ?? 'Studio object was not found.', 404, { objectId });
    if (uploadResult.error || !uploadResult.data?.storage_path) throw new StudioMultimodalError('UPLOAD_NOT_FOUND', uploadResult.error?.message ?? 'Stored session-package upload was not found.', 404, { objectId });

    const object = record(objectResult.data);
    const upload = record(uploadResult.data);
    const archiveBytes = Number(upload.size_bytes ?? object.size_bytes ?? 0);
    if (!Number.isFinite(archiveBytes) || archiveBytes <= 0) throw new StudioMultimodalError('PACKAGE_PARSE_FAILED', 'Stored package does not expose a valid byte size.', 422, { objectId });

    const jobResult = await db.from('studio_analysis_jobs').insert({
      object_id: objectId,
      status: 'running',
      reason: null,
      owner_id: access.user.id,
      payload: { engine: ENGINE, engineVersion: ENGINE_VERSION, startedAt: new Date().toISOString(), rangeAnalysis: true },
    }).select('id').single();
    if (jobResult.error || !jobResult.data) throw new StudioMultimodalError('PERSISTENCE_FAILED', jobResult.error?.message ?? 'Package analysis job could not be created.', 503, { objectId });
    const jobId = String(jobResult.data.id);

    try {
      const signedUrl = await createStudioContentSignedUrl(objectId, 900);
      const manifest = await analyzeStudioSessionPackage({ signedUrl, archiveBytes });
      const observedAt = new Date().toISOString();
      const logicVersion = manifest.logicVersionCandidates[0] ?? null;
      const sampleRate = manifest.sampleRateCandidates.length === 1 ? manifest.sampleRateCandidates[0] : null;
      const rows = [
        feature({ objectId, key: 'session_package_format', label: 'SESSION PACKAGE FORMAT', text: manifest.format, explanation: 'Archive container identified from bounded ZIP central-directory parsing.' }),
        feature({ objectId, key: 'session_daw', label: 'DAW', text: manifest.daw, confidence: manifest.daw === 'Logic Pro' ? 1 : 0.4, explanation: 'DAW classification is based on .logicx package structure and ProjectData presence, not DAW execution.' }),
        feature({ objectId, key: 'session_logic_version', label: 'LOGIC VERSION CANDIDATE', text: logicVersion, confidence: logicVersion ? 0.72 : 0, explanation: 'Candidate version extracted from printable ProjectData strings; absent values remain unknown.' }),
        feature({ objectId, key: 'session_sample_rate_hz', label: 'SESSION SAMPLE RATE CANDIDATE', numeric: sampleRate, unit: 'Hz', confidence: sampleRate ? 0.7 : 0, explanation: 'A sample rate is persisted only when the ProjectData string scan yields one unambiguous standard rate.' }),
        feature({ objectId, key: 'session_archive_entries', label: 'ARCHIVE ENTRIES', numeric: manifest.archiveEntryCount, unit: 'entries', explanation: 'ZIP central-directory entry count.' }),
        feature({ objectId, key: 'session_audio_assets', label: 'AUDIO ASSETS', numeric: manifest.audioEntryCount, unit: 'files', explanation: 'Audio assets counted by extension from the ZIP central directory.' }),
        feature({ objectId, key: 'session_active_audio_assets', label: 'ACTIVE AUDIO ASSETS', numeric: manifest.activeAudioEntryCount, unit: 'files', explanation: 'Audio assets outside paths explicitly marked Unused.' }),
        feature({ objectId, key: 'session_unused_audio_assets', label: 'UNUSED AUDIO ASSETS', numeric: manifest.unusedAudioEntryCount, unit: 'files', explanation: 'Audio assets located in paths explicitly marked Unused.' }),
        feature({ objectId, key: 'session_projectdata_entries', label: 'PROJECTDATA ENTRIES', numeric: manifest.projectDataEntryCount, unit: 'files', explanation: 'Logic ProjectData records present in the archive.' }),
        feature({ objectId, key: 'session_archive_manifest_sha256', label: 'ARCHIVE MANIFEST SHA-256', text: manifest.archiveManifestSha256, explanation: 'SHA-256 of canonical central-directory metadata. This is not represented as a full source-file SHA-256.' }),
        feature({
          objectId,
          key: 'session_manifest',
          label: 'SESSION MANIFEST',
          text: manifest.packageRoot ?? 'ZIP session package',
          confidence: manifest.daw === 'Logic Pro' ? 0.92 : 0.65,
          explanation: 'Bounded production-session manifest retained after the heavy source archive is discarded.',
          payload: { manifest, warnings: manifest.warnings, epistemicClass: 'OBSERVED_AND_DERIVED', sourceFileRetained: false },
        }),
      ];

      const removed = await db.from('studio_object_features').delete().eq('object_id', objectId).eq('source', ENGINE);
      if (removed.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', removed.error.message, 503, { objectId, stage: 'replace_features' });
      const inserted = await db.from('studio_object_features').insert(rows);
      if (inserted.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', inserted.error.message, 503, { objectId, stage: 'insert_features' });

      const evidence = await db.from('studio_evidence_traces').insert({
        object_id: objectId,
        owner_id: access.user.id,
        source: ENGINE,
        label: 'Transient DAW/session package manifest extracted',
        payload: {
          observedAt,
          engineVersion: ENGINE_VERSION,
          archiveManifestSha256: manifest.archiveManifestSha256,
          sourceFileSha256: null,
          sourceFileSha256Status: 'NOT_COMPUTED_RANGE_ANALYSIS',
          packageRoot: manifest.packageRoot,
          archiveEntryCount: manifest.archiveEntryCount,
          audioEntryCount: manifest.audioEntryCount,
          activeAudioEntryCount: manifest.activeAudioEntryCount,
          unusedAudioEntryCount: manifest.unusedAudioEntryCount,
          warnings: manifest.warnings,
        },
      }).select('id').single();
      if (evidence.error || !evidence.data) throw new StudioMultimodalError('PERSISTENCE_FAILED', evidence.error?.message ?? 'Package evidence trace could not be persisted.', 503, { objectId });

      const storagePath = String(upload.storage_path);
      const purge = await db.storage.from(STUDIO_OBJECT_BUCKET).remove([storagePath]);
      const sourcePurged = !purge.error;
      const previousMetadata = record(object.metadata);
      const objectUpdate = await db.from('studio_objects').update({
        status: 'ready',
        source_uri: sourcePurged ? `session-manifest://${objectId}` : object.source_uri,
        updated_at: observedAt,
        metadata: {
          ...previousMetadata,
          modality: 'session_package',
          sessionPackageEngine: ENGINE,
          sessionPackageEngineVersion: ENGINE_VERSION,
          sessionPackageManifest: manifest,
          sourceRetention: sourcePurged ? 'EXTRACTED_THEN_DISCARDED' : 'RETAINED_PURGE_FAILED',
          sourceDiscardedAt: sourcePurged ? observedAt : null,
          sourcePurgeError: purge.error?.message ?? null,
        },
      }).eq('id', objectId);
      if (objectUpdate.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', objectUpdate.error.message, 503, { objectId, stage: 'object_update' });

      if (sourcePurged) {
        const uploadUpdate = await db.from('studio_uploads').update({ storage_path: null, status: 'missing' }).eq('id', String(upload.id));
        if (uploadUpdate.error) manifest.warnings.push(`SOURCE_PURGED_UPLOAD_ROW_UPDATE_FAILED:${uploadUpdate.error.message}`);
      } else {
        manifest.warnings.push(`SOURCE_PURGE_FAILED:${purge.error?.message ?? 'unknown'}`);
      }

      const job = await db.from('studio_analysis_jobs').update({
        status: 'complete',
        reason: null,
        updated_at: observedAt,
        payload: {
          engine: ENGINE,
          engineVersion: ENGINE_VERSION,
          completedAt: observedAt,
          featureCount: rows.length,
          rangeAnalysis: true,
          sourcePurged,
          warnings: manifest.warnings,
        },
      }).eq('id', jobId);
      if (job.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', job.error.message, 503, { objectId, stage: 'job_complete' });

      await db.from('studio_archive_events').insert({
        session_id: object.session_id ?? null,
        object_id: objectId,
        owner_id: access.user.id,
        event_type: 'session_package_manifest_extracted',
        label: sourcePurged ? 'Session package parsed; heavy source discarded' : 'Session package parsed; source purge failed',
        source: ENGINE,
        payload: { evidenceId: String(evidence.data.id), archiveManifestSha256: manifest.archiveManifestSha256, sourcePurged, observedAt },
      });

      return NextResponse.json({
        ok: true,
        objectId,
        jobId,
        modality: 'session_package',
        status: manifest.warnings.some((warning) => warning.startsWith('SOURCE_PURGE_FAILED')) ? 'DEGRADED' : 'COMPLETE',
        engine: ENGINE,
        engineVersion: ENGINE_VERSION,
        checksumSha256: manifest.archiveManifestSha256,
        checksumKind: 'ZIP_CENTRAL_DIRECTORY_MANIFEST_SHA256',
        sourceFileSha256: null,
        featureCount: rows.length,
        warnings: manifest.warnings,
        details: { manifest, sourcePurged, evidenceId: String(evidence.data.id) },
      }, { status: 201 });
    } catch (error) {
      await db.from('studio_analysis_jobs').update({
        status: 'failed',
        reason: error instanceof StudioMultimodalError ? error.code : 'ANALYSIS_FAILED',
        updated_at: new Date().toISOString(),
        payload: { engine: ENGINE, engineVersion: ENGINE_VERSION, error: error instanceof Error ? error.message : String(error) },
      }).eq('id', jobId);
      throw error;
    }
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const body = toStudioMultimodalApiError(error);
    const status = error instanceof StudioMultimodalError ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
