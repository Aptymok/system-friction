import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { StudioGenericFeature, StudioModality } from './types';
import { StudioMultimodalError } from './types';

type Row = Record<string, unknown>;

export async function findCompletedMultimodalJob(
  objectId: string,
  idempotencyKey: string,
  supabase: SupabaseClient = createServiceSupabaseClient(),
) {
  const { data, error } = await supabase
    .from('studio_analysis_jobs')
    .select('*')
    .eq('object_id', objectId)
    .eq('status', 'complete')
    .contains('payload', { idempotencyKey })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new StudioMultimodalError('PERSISTENCE_FAILED', error.message, 503, { objectId });
  return data as Row | null;
}

export async function createMultimodalJob(
  objectId: string,
  payload: Record<string, unknown>,
  supabase: SupabaseClient = createServiceSupabaseClient(),
) {
  const { data, error } = await supabase
    .from('studio_analysis_jobs')
    .insert({ object_id: objectId, status: 'queued', reason: null, payload })
    .select('*')
    .single();
  if (error || !data) throw new StudioMultimodalError('PERSISTENCE_FAILED', error?.message ?? 'Analysis job could not be created.', 503, { objectId });
  return data as Row;
}

export async function updateMultimodalJob(
  jobId: string,
  status: 'queued' | 'running' | 'complete' | 'blocked' | 'failed',
  reason: string | null,
  payload: Record<string, unknown>,
  supabase: SupabaseClient = createServiceSupabaseClient(),
) {
  const { error } = await supabase
    .from('studio_analysis_jobs')
    .update({ status, reason, payload, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw new StudioMultimodalError('PERSISTENCE_FAILED', error.message, 503, { jobId, status });
}

export async function markStudioObjectStatus(
  objectId: string,
  status: 'uploaded' | 'analyzing' | 'ready' | 'blocked' | 'failed',
  metadata: Record<string, unknown>,
  supabase: SupabaseClient = createServiceSupabaseClient(),
) {
  const { error } = await supabase
    .from('studio_objects')
    .update({ status, metadata, updated_at: new Date().toISOString() })
    .eq('id', objectId);
  if (error) throw new StudioMultimodalError('PERSISTENCE_FAILED', error.message, 503, { objectId, status });
}

export async function persistGenericFeatures(input: {
  objectId: string;
  jobId: string;
  checksumSha256: string;
  engine: string;
  engineVersion: string;
  features: StudioGenericFeature[];
  modality: StudioModality;
  supabase?: SupabaseClient;
}) {
  const supabase = input.supabase ?? createServiceSupabaseClient();
  const sourcePrefix = `studio_${input.modality}:`;
  const deletion = await supabase
    .from('studio_object_features')
    .delete()
    .eq('object_id', input.objectId)
    .like('source', `${sourcePrefix}%`);
  if (deletion.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', deletion.error.message, 503, { objectId: input.objectId });

  const rows = input.features.map((feature) => ({
    object_id: input.objectId,
    feature_key: feature.key,
    label: feature.label,
    numeric_value: feature.numericValue,
    text_value: feature.textValue,
    unit: feature.unit,
    source: feature.source,
    confidence: feature.confidence,
    payload: {
      ...(feature.payload ?? {}),
      status: feature.status,
      explanation: feature.explanation,
      warnings: feature.warnings,
      jobId: input.jobId,
      checksumSha256: input.checksumSha256,
      engine: input.engine,
      engineVersion: input.engineVersion,
      modality: input.modality,
    },
  }));

  if (!rows.length) return;
  const inserted = await supabase.from('studio_object_features').insert(rows);
  if (inserted.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', inserted.error.message, 503, { objectId: input.objectId });
}

export async function replaceSpecializedRow(input: {
  table: 'studio_text_features' | 'studio_image_features' | 'studio_video_features' | 'studio_community_features' | 'studio_time_coordinates';
  objectId: string;
  row: Record<string, unknown>;
  supabase?: SupabaseClient;
}) {
  const supabase = input.supabase ?? createServiceSupabaseClient();
  const deletion = await supabase.from(input.table).delete().eq('object_id', input.objectId);
  if (deletion.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', deletion.error.message, 503, { table: input.table, objectId: input.objectId });
  const inserted = await supabase.from(input.table).insert({ object_id: input.objectId, ...input.row });
  if (inserted.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', inserted.error.message, 503, { table: input.table, objectId: input.objectId });
}

export async function recordMultimodalEvidence(input: {
  objectId: string;
  label: string;
  payload: Record<string, unknown>;
  supabase?: SupabaseClient;
}) {
  const supabase = input.supabase ?? createServiceSupabaseClient();
  const { error } = await supabase.from('studio_evidence_traces').insert({
    object_id: input.objectId,
    source: 'studio_multimodal_engine',
    label: input.label,
    payload: input.payload,
  });
  if (error) throw new StudioMultimodalError('PERSISTENCE_FAILED', error.message, 503, { objectId: input.objectId });
}
