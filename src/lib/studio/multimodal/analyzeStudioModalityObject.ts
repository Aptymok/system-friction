import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildStudioUploadDescriptor } from './detect';
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
import {
  StudioMultimodalError,
  type StudioGenericFeature,
  type StudioModality,
  type StudioMultimodalAnalysisResult,
} from './types';

export const STUDIO_MULTIMODAL_ENGINE = 'studio_multimodal_engine';
export const STUDIO_MULTIMODAL_ENGINE_VERSION = '2026-07-11.3';

type Row = Record<string, unknown>;
type SupportedModality = Exclude<StudioModality, 'audio' | 'unknown'>;
type SpecializedTable =
  | 'studio_text_features'
  | 'studio_image_features'
  | 'studio_video_features'
  | 'studio_community_features'
  | 'studio_time_coordinates';

export type StudioScopedAnalysis = {
  features: StudioGenericFeature[];
  row: Record<string, unknown>;
  warnings: string[];
  table: SpecializedTable;
};

export type StudioScopedAnalyzer = (input: {
  bytes: Buffer;
  extension: string;
  modality: SupportedModality;
}) => Promise<StudioScopedAnalysis> | StudioScopedAnalysis;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function resolveStudioObjectDescriptor(
  objectId: string,
  supabase: SupabaseClient = createServiceSupabaseClient(),
) {
  const { data: object, error: objectError } = await supabase
    .from('studio_objects')
    .select('*')
    .eq('id', objectId)
    .maybeSingle();
  if (objectError || !object) {
    throw new StudioMultimodalError('OBJECT_NOT_FOUND', 'Studio object was not found.', 404, { objectId });
  }

  const { data: upload, error: uploadError } = await supabase
    .from('studio_uploads')
    .select('*')
    .eq('object_id', objectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (uploadError || !upload) {
    throw new StudioMultimodalError('UPLOAD_NOT_FOUND', 'Studio upload was not found.', 404, { objectId });
  }

  const metadata = record(object.metadata);
  const fileName = stringValue(metadata.originalFileName)
    ?? stringValue(upload.storage_path)?.split('/').at(-1)
    ?? String(object.title || 'studio-object');
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
  return ['UNSUPPORTED_FILE_TYPE', 'FILE_TOO_LARGE', 'EXTRACTION_RUNTIME_UNAVAILABLE', 'UPLOAD_NOT_COMPLETE']
    .includes(error.code)
    ? 'blocked'
    : 'failed';
}

export async function analyzeStudioModalityObject(
  objectId: string,
  input: {
    expectedModalities: SupportedModality[];
    analyze: StudioScopedAnalyzer;
    force?: boolean;
    requestedByUserId?: string | null;
  },
): Promise<StudioMultimodalAnalysisResult | Record<string, unknown>> {
  const descriptorState = await resolveStudioObjectDescriptor(objectId);
  const modality = descriptorState.descriptor.modality;

  if (modality === 'audio' || modality === 'unknown' || !input.expectedModalities.includes(modality)) {
    throw new StudioMultimodalError(
      'UNSUPPORTED_FILE_TYPE',
      'The object modality does not match this analysis function.',
      415,
      { objectId, modality, expectedModalities: input.expectedModalities },
    );
  }

  const stored = await loadStudioObjectBytes(objectId);
  const idempotencyKey = `studio-multimodal:${objectId}:${stored.checksumSha256}:${STUDIO_MULTIMODAL_ENGINE_VERSION}:${modality}`;
  const supabase = createServiceSupabaseClient();

  if (!input.force) {
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
    requestedByUserId: input.requestedByUserId ?? null,
    extension: descriptorState.descriptor.extension,
  };
  const job = await createMultimodalJob(objectId, basePayload, supabase);
  const jobId = String(job.id);

  try {
    await markStudioObjectStatus(objectId, 'analyzing', {
      ...record(descriptorState.object.metadata),
      multimodalAnalysis: { ...basePayload, jobId, status: 'RUNNING', startedAt: new Date().toISOString() },
    }, supabase);
    await updateMultimodalJob(jobId, 'running', null, {
      ...basePayload,
      startedAt: new Date().toISOString(),
    }, supabase);

    const analysis = await input.analyze({
      bytes: stored.bytes,
      extension: descriptorState.descriptor.extension,
      modality,
    });

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
    await replaceSpecializedRow({ table: analysis.table, objectId, row: analysis.row, supabase });
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

    const meaningfulFeatures = analysis.features.filter(
      (feature) => feature.status !== 'MISSING' && (feature.numericValue !== null || feature.textValue !== null),
    );
    const semanticStatus: 'COMPLETE' | 'DEGRADED' = meaningfulFeatures.length === analysis.features.length
      ? 'COMPLETE'
      : 'DEGRADED';
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
