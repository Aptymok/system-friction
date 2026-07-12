import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { StudioAudioError } from './audioErrors';
import type {
  EnergySegment,
  StudioAudioAnalysisResult,
  StudioAudioFeature,
  StudioAudioObjectRow,
  StudioAudioProbe,
  TimeRegion,
  WaveformPeak,
} from './audioTypes';

type Row = Record<string, unknown>;

function featureValueColumns(feature: StudioAudioFeature) {
  if (typeof feature.value === 'number') return { numeric_value: feature.value, text_value: null };
  if (typeof feature.value === 'string') return { numeric_value: null, text_value: feature.value };
  return { numeric_value: null, text_value: null };
}

function featureByKey(features: StudioAudioFeature[], key: string) {
  return features.find((feature) => feature.key === key)?.value ?? null;
}

function numericFeature(features: StudioAudioFeature[], key: string) {
  const value = featureByKey(features, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function jsonNumberArray(values: number[], limit = 4096) {
  return values.slice(0, limit).map((value) => (Number.isFinite(value) ? Number(value.toFixed(6)) : null));
}

function waveformForColumn(waveform: WaveformPeak[]) {
  return waveform.map((item) => ({
    i: item.index,
    t0: Number(item.startSeconds.toFixed(4)),
    t1: Number(item.endSeconds.toFixed(4)),
    min: Number(item.min.toFixed(6)),
    max: Number(item.max.toFixed(6)),
    rms: Number(item.rms.toFixed(6)),
  }));
}

function energyForColumn(segments: EnergySegment[]) {
  return segments.map((item) => ({
    i: item.index,
    t0: Number(item.startSeconds.toFixed(4)),
    t1: Number(item.endSeconds.toFixed(4)),
    rms: Number(item.rms.toFixed(6)),
    peak: Number(item.peak.toFixed(6)),
    centroidHz: item.centroidHz === null ? null : Number(item.centroidHz.toFixed(3)),
  }));
}

async function deletePriorAudioAnalysisRows(
  supabase: SupabaseClient,
  objectId: string,
  idempotencyKey: string,
) {
  const operations = [
    supabase
      .from('studio_object_features')
      .delete()
      .eq('object_id', objectId)
      .contains('payload', { idempotencyKey }),
    supabase
      .from('studio_audio_features')
      .delete()
      .eq('object_id', objectId)
      .contains('payload', { idempotencyKey }),
    supabase
      .from('studio_time_coordinates')
      .delete()
      .eq('object_id', objectId)
      .contains('payload', { idempotencyKey }),
    supabase
      .from('studio_evidence_traces')
      .delete()
      .eq('object_id', objectId)
      .contains('payload', { idempotencyKey }),
  ];

  const results = await Promise.all(operations);
  const failure = results.find((result) => result.error)?.error;
  if (failure) {
    throw new StudioAudioError('PERSISTENCE_FAILED', failure.message, 500, {
      objectId,
      operation: 'delete_prior_audio_analysis_rows',
    });
  }
}

export async function findExistingStudioAudioAnalysis(
  supabase: SupabaseClient,
  objectId: string,
  idempotencyKey: string
) {
  const { data, error } = await supabase
    .from('studio_analysis_jobs')
    .select('*')
    .eq('object_id', objectId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new StudioAudioError('PERSISTENCE_FAILED', error.message, 500, { objectId, table: 'studio_analysis_jobs' });
  return (data as Row[] | null ?? []).find((row) => {
    const payload = row.payload as Row | null;
    return payload?.idempotencyKey === idempotencyKey;
  }) ?? null;
}

export async function createStudioAudioJob(
  supabase: SupabaseClient,
  objectId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('studio_analysis_jobs')
    .insert({
      object_id: objectId,
      status: 'queued',
      reason: null,
      payload: { ...payload, idempotencyKey },
    })
    .select('*')
    .single();

  if (error || !data) throw new StudioAudioError('PERSISTENCE_FAILED', error?.message ?? 'Unable to create Studio analysis job.', 500, { objectId });
  return data as Row;
}

export async function updateStudioAudioJob(
  supabase: SupabaseClient,
  jobId: string,
  status: 'queued' | 'running' | 'complete' | 'blocked' | 'failed',
  reason: string | null,
  payload: Record<string, unknown>
) {
  const { error } = await supabase
    .from('studio_analysis_jobs')
    .update({
      status,
      reason,
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) throw new StudioAudioError('PERSISTENCE_FAILED', error.message, 500, { jobId, table: 'studio_analysis_jobs' });
}

export async function markStudioObjectAnalyzing(supabase: SupabaseClient, objectId: string) {
  const { error } = await supabase
    .from('studio_objects')
    .update({ status: 'analyzing', updated_at: new Date().toISOString() })
    .eq('id', objectId);
  if (error) throw new StudioAudioError('PERSISTENCE_FAILED', error.message, 500, { objectId, table: 'studio_objects' });
}

export async function markStudioObjectAnalysisFinished(
  supabase: SupabaseClient,
  objectId: string,
  status: 'ready' | 'blocked' | 'failed',
  metadata: Record<string, unknown>
) {
  const { error } = await supabase
    .from('studio_objects')
    .update({ status, metadata, updated_at: new Date().toISOString() })
    .eq('id', objectId);
  if (error) throw new StudioAudioError('PERSISTENCE_FAILED', error.message, 500, { objectId, table: 'studio_objects' });
}

export async function persistStudioAudioAnalysis(
  result: StudioAudioAnalysisResult,
  object: StudioAudioObjectRow,
  probe: StudioAudioProbe,
  frequencyBands: number[],
  supabase: SupabaseClient = createServiceSupabaseClient()
) {
  const observedAt = new Date().toISOString();
  const commonPayload = {
    idempotencyKey: result.idempotencyKey,
    jobId: result.jobId,
    engine: result.engine,
    engineVersion: result.engineVersion,
    checksumSha256: result.checksumSha256,
    observedAt,
    probe,
  };

  // A failed prior attempt may have persisted only part of the result set.
  // Remove rows for this exact analysis identity before reinserting them.
  await deletePriorAudioAnalysisRows(supabase, result.objectId, result.idempotencyKey);

  const objectFeatureRows = result.features.map((item) => ({
    object_id: result.objectId,
    feature_key: item.key,
    label: item.label,
    ...featureValueColumns(item),
    unit: item.unit,
    source: item.source,
    confidence: item.confidence,
    payload: {
      ...commonPayload,
      status: item.status,
      formulaVersion: item.formulaVersion,
      warnings: item.warnings,
      explanation: item.explanation,
      featurePayload: item.payload ?? {},
    },
  }));

  const { error: featureError } = await supabase.from('studio_object_features').insert(objectFeatureRows);
  if (featureError) throw new StudioAudioError('PERSISTENCE_FAILED', featureError.message, 500, { table: 'studio_object_features' });

  const { error: audioError } = await supabase.from('studio_audio_features').insert({
    object_id: result.objectId,
    rms: numericFeature(result.features, 'rms_dbfs'),
    peak: numericFeature(result.features, 'peak_dbfs'),
    clipping_risk: numericFeature(result.features, 'clipping_risk'),
    dynamic_range: numericFeature(result.features, 'dynamic_range_db'),
    lufs: numericFeature(result.features, 'lufs_integrated'),
    spectral_centroid: numericFeature(result.features, 'spectral_centroid_hz'),
    frequency_bands: jsonNumberArray(frequencyBands, 12),
    waveform: waveformForColumn(result.waveform),
    energy_segments: energyForColumn(result.energySegments),
    payload: {
      ...commonPayload,
      featureKeys: result.features.map((item) => item.key),
      warnings: result.warnings,
    },
  });
  if (audioError) throw new StudioAudioError('PERSISTENCE_FAILED', audioError.message, 500, { table: 'studio_audio_features' });

  const timeRows = result.timeRegions.slice(0, 512).map((region) => ({
    object_id: result.objectId,
    time_range: `${region.startSeconds.toFixed(3)}-${region.endSeconds.toFixed(3)}`,
    place_label: region.type,
    semantic_anchors: [region.label],
    historical_vector_tags: [],
    dominant_tensions: [],
    gap_description: null,
    payload: {
      ...commonPayload,
      markerId: region.id,
      markerType: region.type,
      startSeconds: region.startSeconds,
      endSeconds: region.endSeconds,
      confidence: region.confidence,
      markerPayload: region.payload ?? {},
    },
  }));
  if (timeRows.length) {
    const { error: timeError } = await supabase.from('studio_time_coordinates').insert(timeRows);
    if (timeError) throw new StudioAudioError('PERSISTENCE_FAILED', timeError.message, 500, { table: 'studio_time_coordinates' });
  }

  const reliability = result.status === 'COMPLETE' ? 0.86 : 0.62;
  const { error: evidenceError } = await supabase.from('studio_evidence_traces').insert({
    object_id: result.objectId,
    source: result.engine,
    label: 'Studio audio extraction',
    payload: {
      ...commonPayload,
      reliability,
      uri: object.source_uri,
      status: result.status,
      warnings: result.warnings,
      featureCount: result.features.length,
      waveformPeaks: result.waveform.length,
      energySegments: result.energySegments.length,
      timeRegions: result.timeRegions.length,
    },
  });
  if (evidenceError) throw new StudioAudioError('PERSISTENCE_FAILED', evidenceError.message, 500, { table: 'studio_evidence_traces' });
}

export function payloadWithError(payload: Record<string, unknown>, error: unknown) {
  return {
    ...payload,
    error: error instanceof Error ? error.message : 'Unknown audio analysis error.',
    failedAt: new Date().toISOString(),
  };
}
