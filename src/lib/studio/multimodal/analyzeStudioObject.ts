import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { buildStudioUploadDescriptor } from './detect';
import { analyzeStudioImage } from './imageAnalyzer';
import {
  createMultimodalJob,
  findCompletedMultimodalJob,
  markStudioObjectStatus,
  persistGenericFeatures,
  recordMultimodalEvidence,
  replaceSpecializedRow,
  updateMultimodalJob,
} from './persistence';
import { loadStudioObjectBytes } from './storage';
import { analyzeStructuredStudioObject } from './structuredAnalyzer';
import { analyzeStudioText } from './textAnalyzer';
import { StudioMultimodalError, type StudioModality, type StudioMultimodalAnalysisResult } from './types';
import { analyzeStudioVideo } from './videoAnalyzer';

export const STUDIO_MULTIMODAL_ENGINE = 'studio_multimodal_engine';
export const STUDIO_MULTIMODAL_ENGINE_VERSION = '2026-07-11.1';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function readObjectDescriptor(objectId: string) {
  const supabase = createServiceSupabaseClient();
  const { data: object, error: objectError } = await supabase.from('studio_objects').select('*').eq('id', objectId).maybeSingle();
  if (objectError || !object) throw new StudioMultimodalError('OBJECT_NOT_FOUND', 'Studio object was not found.', 404, { objectId });
  const { data: upload, error: uploadError } = await supabase
    .from('studio_uploads')
    .select('*')
    .eq('object_id', objectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (uploadError || !upload) throw new StudioMultimodalError('UPLOAD_NOT_FOUND', 'Studio upload was not found.', 404, { objectId });

  const metadata = record(object.metadata);
  const fileName = stringValue(metadata.originalFileName) ?? stringValue(upload.storage_path)?.split('/').at(-1) ?? String(object.title || 'studio-object');
  const descriptor = buildStudioUploadDescriptor({
    fileName,
    mimeType: upload.mime_type ?? object.mime_type,
    sizeBytes: upload.size_bytes ?? object.size_bytes,
    title: object.title,
    requestedObjectType: metadata.modality ?? object.object_type,
  });
  return { object: object as Row, upload: upload as Row, descriptor };
}

function failedStatus(error: unknown): 'blocked' | 'failed' {
  if (!(error instanceof StudioMultimodalError)) return 'failed';
  return ['UNSUPPORTED_FILE_TYPE', 'FILE_TOO_LARGE', 'EXTRACTION_RUNTIME_UNAVAILABLE', 'UPLOAD_NOT_COMPLETE'].includes(error.code) ? 'blocked' : 'failed';
}

export async function analyzeStudioObject(
  objectId: string,
  options: { force?: boolean; requestedByUserId?: string | null } = {},
): Promise<StudioMultimodalAnalysisResult | Record<string, unknown>> {
  const descriptorState = await readObjectDescriptor(objectId);
  if (descriptorState.descriptor.modality === 'audio') {
    return analyzeStudioAudioObject(objectId, options);
  }

  if (descriptorState.descriptor.modality === 'unknown') {
    throw new StudioMultimodalError('UNSUPPORTED_FILE_TYPE', 'Studio cannot analyze an unknown object modality.', 415, { objectId });
  }

  const stored = await loadStudioObjectBytes(objectId);
  const modality = descriptorState.descriptor.modality as Exclude<StudioModality, 'audio' | 'unknown'>;
  const idempotencyKey = `studio-multimodal:${objectId}:${stored.checksumSha256}:${STUDIO_MULTIMODAL_ENGINE_VERSION}:${modality}`;
  const supabase = createServiceSupabaseClient();

  if (!options.force) {
    const existing = await findCompletedMultimodalJob(objectId, idempotencyKey, supabase);
    if (existing) {
      return {
        ok: true,
        reused: true,
        objectId,
        jobId: String(existing.id),
        modality,
        status: String(record(existing.payload).semanticStatus ?? 'COMPLETE'),
        checksumSha256: stored.checksumSha256,
      };
    }
  }

  const basePayload = {
    idempotencyKey,
    engine: STUDIO_MULTIMODAL_ENGINE,
    engineVersion: STUDIO_MULTIMODAL_ENGINE_VERSION,
    modality,
    checksumSha256: stored.checksumSha256,
    byteLength: stored.byteLength,
    requestedByUserId: options.requestedByUserId ?? null,
    extension: descriptorState.descriptor.extension,
  };
  const job = await createMultimodalJob(objectId, basePayload, supabase);
  const jobId = String(job.id);

  try {
    await markStudioObjectStatus(objectId, 'analyzing', {
      ...record(descriptorState.object.metadata),
      multimodalAnalysis: { ...basePayload, jobId, status: 'RUNNING', startedAt: new Date().toISOString() },
    }, supabase);
    await updateMultimodalJob(jobId, 'running', null, { ...basePayload, startedAt: new Date().toISOString() }, supabase);

    let analysis:
      | Awaited<ReturnType<typeof analyzeStudioText>>
      | Awaited<ReturnType<typeof analyzeStudioImage>>
      | Awaited<ReturnType<typeof analyzeStudioVideo>>
      | ReturnType<typeof analyzeStructuredStudioObject>;
    let table: 'studio_text_features' | 'studio_image_features' | 'studio_video_features' | 'studio_community_features' | 'studio_time_coordinates';

    if (modality === 'text') {
      analysis = await analyzeStudioText(stored.bytes, descriptorState.descriptor.extension);
      table = 'studio_text_features';
    } else if (modality === 'image') {
      analysis = await analyzeStudioImage(stored.bytes);
      table = 'studio_image_features';
    } else if (modality === 'video') {
      analysis = await analyzeStudioVideo(stored.bytes, descriptorState.descriptor.extension);
      table = 'studio_video_features';
    } else if (modality === 'community' || modality === 'time_coordinate') {
      analysis = analyzeStructuredStudioObject(stored.bytes, descriptorState.descriptor.extension, modality);
      table = analysis.table;
    } else {
      throw new StudioMultimodalError('UNSUPPORTED_FILE_TYPE', 'No analyzer is registered for this modality.', 415, { modality });
    }

    await persistGenericFeatures({
      objectId,
      jobId,
      checksumSha256: stored.checksumSha256,
      engine: STUDIO_MULTIMODAL_ENGINE,
      engineVersion: STUDIO_MULTIMODAL_ENGINE_VERSION,
      features: analysis.features,
      modality,
      supabase,
    });
    await replaceSpecializedRow({ table, objectId, row: analysis.row, supabase });
    await recordMultimodalEvidence({
      objectId,
      label: `${modality} analysis ${STUDIO_MULTIMODAL_ENGINE_VERSION}`,
      payload: {
        jobId,
        checksumSha256: stored.checksumSha256,
        modality,
        featureKeys: analysis.features.map((feature) => feature.key),
        warnings: analysis.warnings,
      },
      supabase,
    });

    const meaningfulFeatures = analysis.features.filter((feature) => feature.status !== 'MISSING' && (feature.numericValue !== null || feature.textValue !== null));
    const semanticStatus: 'COMPLETE' | 'DEGRADED' = meaningfulFeatures.length === analysis.features.length ? 'COMPLETE' : 'DEGRADED';
    const completedAt = new Date().toISOString();
    await updateMultimodalJob(jobId, 'complete', null, {
      ...basePayload,
      semanticStatus,
      completedAt,
      featureCount: analysis.features.length,
      meaningfulFeatureCount: meaningfulFeatures.length,
      warnings: analysis.warnings,
    }, supabase);
    await markStudioObjectStatus(objectId, 'ready', {
      ...record(descriptorState.object.metadata),
      multimodalAnalysis: {
        ...basePayload,
        jobId,
        status: semanticStatus,
        completedAt,
        featureCount: analysis.features.length,
        warnings: analysis.warnings,
      },
    }, supabase);

    return {
      ok: true,
      objectId,
      jobId,
      modality,
      status: semanticStatus,
      engine: STUDIO_MULTIMODAL_ENGINE,
      engineVersion: STUDIO_MULTIMODAL_ENGINE_VERSION,
      checksumSha256: stored.checksumSha256,
      featureCount: analysis.features.length,
      warnings: analysis.warnings,
    };
  } catch (error) {
    const status = failedStatus(error);
    const reason = error instanceof StudioMultimodalError ? error.code : 'ANALYSIS_FAILED';
    const failedAt = new Date().toISOString();
    await updateMultimodalJob(jobId, status, reason, {
      ...basePayload,
      failedAt,
      error: error instanceof Error ? error.message : String(error),
    }, supabase).catch(() => undefined);
    await markStudioObjectStatus(objectId, status === 'blocked' ? 'blocked' : 'failed', {
      ...record(descriptorState.object.metadata),
      multimodalAnalysis: { ...basePayload, jobId, status: status.toUpperCase(), reason, failedAt },
    }, supabase).catch(() => undefined);
    throw error;
  }
}
