import 'server-only';

import sharp from 'sharp';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { loadStudioObjectBytes } from './storage';
import { analyzeStudioVideo } from './videoAnalyzer';
import { StudioMultimodalError } from './types';

type Row = Record<string, unknown>;
type Feature = {
  key: string;
  label: string;
  numericValue: number | null;
  textValue: string | null;
  unit: string | null;
  source: string;
  confidence: number | null;
  status: 'OBSERVED' | 'DERIVED' | 'MISSING';
  explanation: string;
  warnings: string[];
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function extension(path: string) {
  const value = path.split('/').at(-1) ?? 'object.bin';
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
}

function textFeatures(bytes: Buffer): Feature[] {
  const decoded = bytes.toString('utf8').replace(/\u0000/g, '').trim();
  const words = decoded ? decoded.split(/\s+/).filter(Boolean) : [];
  const sentences = decoded ? decoded.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean) : [];
  const lines = decoded ? decoded.split(/\r?\n/).filter((item) => item.trim()).length : 0;
  const source = 'studio_text:deterministic_v1';
  return [
    { key: 'text_characters', label: 'CHARACTERS', numericValue: decoded.length, textValue: null, unit: 'characters', source, confidence: 1, status: 'OBSERVED', explanation: 'UTF-8 characters decoded from the persisted object.', warnings: [] },
    { key: 'text_words', label: 'WORDS', numericValue: words.length, textValue: null, unit: 'words', source, confidence: 1, status: 'OBSERVED', explanation: 'Whitespace-delimited token count.', warnings: [] },
    { key: 'text_sentences', label: 'SENTENCES', numericValue: sentences.length, textValue: null, unit: 'sentences', source, confidence: 0.8, status: 'DERIVED', explanation: 'Sentence estimate from terminal punctuation.', warnings: ['LANGUAGE_AGNOSTIC_SENTENCE_ESTIMATE'] },
    { key: 'text_lines', label: 'NONEMPTY LINES', numericValue: lines, textValue: null, unit: 'lines', source, confidence: 1, status: 'OBSERVED', explanation: 'Non-empty line count.', warnings: [] },
    { key: 'text_preview', label: 'TEXT PREVIEW', numericValue: null, textValue: decoded.slice(0, 1200) || null, unit: null, source, confidence: decoded ? 1 : null, status: decoded ? 'OBSERVED' : 'MISSING', explanation: 'Bounded preview retained for inspection.', warnings: decoded ? [] : ['NO_UTF8_TEXT_DECODED'] },
  ];
}

async function imageFeatures(bytes: Buffer): Promise<Feature[]> {
  const image = sharp(bytes, { failOn: 'none' });
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
  const source = 'studio_image:sharp_v1';
  const brightness = stats.channels.length
    ? stats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / Math.min(3, stats.channels.length) / 255
    : null;
  return [
    { key: 'image_width_px', label: 'IMAGE WIDTH', numericValue: metadata.width ?? null, textValue: null, unit: 'px', source, confidence: metadata.width ? 1 : null, status: metadata.width ? 'OBSERVED' : 'MISSING', explanation: 'Decoded image width.', warnings: [] },
    { key: 'image_height_px', label: 'IMAGE HEIGHT', numericValue: metadata.height ?? null, textValue: null, unit: 'px', source, confidence: metadata.height ? 1 : null, status: metadata.height ? 'OBSERVED' : 'MISSING', explanation: 'Decoded image height.', warnings: [] },
    { key: 'image_format', label: 'IMAGE FORMAT', numericValue: null, textValue: metadata.format ?? null, unit: null, source, confidence: metadata.format ? 1 : null, status: metadata.format ? 'OBSERVED' : 'MISSING', explanation: 'Container format identified by Sharp.', warnings: [] },
    { key: 'image_channels', label: 'IMAGE CHANNELS', numericValue: metadata.channels ?? null, textValue: null, unit: 'channels', source, confidence: metadata.channels ? 1 : null, status: metadata.channels ? 'OBSERVED' : 'MISSING', explanation: 'Decoded channel count.', warnings: [] },
    { key: 'image_mean_brightness', label: 'MEAN BRIGHTNESS', numericValue: brightness, textValue: null, unit: 'ratio', source, confidence: brightness === null ? null : 0.9, status: brightness === null ? 'MISSING' : 'DERIVED', explanation: 'Mean normalized brightness across decoded color channels.', warnings: ['NOT_A_SEMANTIC_VISUAL_INTERPRETATION'] },
    { key: 'image_entropy', label: 'IMAGE ENTROPY', numericValue: typeof stats.entropy === 'number' ? stats.entropy : null, textValue: null, unit: 'bits', source, confidence: typeof stats.entropy === 'number' ? 0.9 : null, status: typeof stats.entropy === 'number' ? 'DERIVED' : 'MISSING', explanation: 'Pixel-distribution entropy calculated by Sharp.', warnings: ['FORMAL_IMAGE_ENTROPY_ONLY'] },
  ];
}

async function persistGenericAnalysis(input: {
  objectId: string;
  jobId: string;
  object: Row;
  features: Feature[];
  warnings: string[];
  engine: string;
}) {
  const supabase = createServiceSupabaseClient();
  const observedAt = new Date().toISOString();
  const featureRows = input.features.map((feature) => ({
    object_id: input.objectId,
    feature_key: feature.key,
    label: feature.label,
    numeric_value: feature.numericValue,
    text_value: feature.textValue,
    unit: feature.unit,
    source: feature.source,
    confidence: feature.confidence,
    payload: {
      status: feature.status,
      explanation: feature.explanation,
      warnings: feature.warnings,
      jobId: input.jobId,
      observedAt,
      engine: input.engine,
    },
  }));
  const removed = await supabase.from('studio_object_features').delete().eq('object_id', input.objectId).eq('source', input.engine);
  if (removed.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', removed.error.message, 503, { objectId: input.objectId });
  const inserted = await supabase.from('studio_object_features').insert(featureRows);
  if (inserted.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', inserted.error.message, 503, { objectId: input.objectId });
  const evidence = await supabase.from('studio_evidence_traces').insert({
    object_id: input.objectId,
    source: input.engine,
    label: 'Studio multimodal extraction',
    payload: {
      observedAt,
      jobId: input.jobId,
      featureCount: input.features.length,
      warnings: input.warnings,
      uri: input.object.source_uri ?? null,
      reliability: input.warnings.length ? 0.72 : 0.9,
    },
  });
  if (evidence.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', evidence.error.message, 503, { objectId: input.objectId });
  const metadata = record(input.object.metadata);
  const updated = await supabase.from('studio_objects').update({
    status: 'ready',
    updated_at: observedAt,
    metadata: {
      ...metadata,
      studioMultimodalEngine: {
        engine: input.engine,
        jobId: input.jobId,
        status: input.warnings.length ? 'DEGRADED' : 'COMPLETE',
        featureCount: input.features.length,
        warnings: input.warnings,
        completedAt: observedAt,
      },
    },
  }).eq('id', input.objectId);
  if (updated.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', updated.error.message, 503, { objectId: input.objectId });
  const job = await supabase.from('studio_analysis_jobs').update({
    status: 'complete',
    reason: null,
    updated_at: observedAt,
    payload: { engine: input.engine, completedAt: observedAt, featureCount: input.features.length, warnings: input.warnings },
  }).eq('id', input.jobId);
  if (job.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', job.error.message, 503, { objectId: input.objectId });
}

export async function analyzeStudioObject(objectId: string, options: { force?: boolean; requestedByUserId?: string | null } = {}) {
  const supabase = createServiceSupabaseClient();
  const objectResult = await supabase.from('studio_objects').select('*').eq('id', objectId).maybeSingle();
  if (objectResult.error || !objectResult.data) throw new StudioMultimodalError('OBJECT_NOT_FOUND', 'Studio object was not found.', 404, { objectId });
  const object = objectResult.data as Row;
  const objectType = String(object.object_type ?? 'unknown').toLowerCase();
  const mimeType = String(object.mime_type ?? '').toLowerCase();

  if (objectType === 'music' || mimeType.startsWith('audio/')) {
    return analyzeStudioAudioObject(objectId, options);
  }

  const stored = await loadStudioObjectBytes(objectId);
  const engine = objectType === 'video' || mimeType.startsWith('video/')
    ? 'studio_video:ffprobe_ffmpeg_sample_v1'
    : objectType === 'image' || mimeType.startsWith('image/')
      ? 'studio_image:sharp_v1'
      : 'studio_text:deterministic_v1';
  const jobResult = await supabase.from('studio_analysis_jobs').insert({
    object_id: objectId,
    status: 'running',
    reason: null,
    payload: { engine, requestedByUserId: options.requestedByUserId ?? null, startedAt: new Date().toISOString() },
  }).select('id').single();
  if (jobResult.error || !jobResult.data) throw new StudioMultimodalError('PERSISTENCE_FAILED', jobResult.error?.message ?? 'Analysis job could not be created.', 503, { objectId });
  const jobId = String(jobResult.data.id);

  try {
    let features: Feature[];
    let warnings: string[] = [];
    if (objectType === 'video' || mimeType.startsWith('video/')) {
      const result = await analyzeStudioVideo(stored.bytes, extension(stored.storagePath));
      features = result.features as Feature[];
      warnings = result.warnings;
    } else if (objectType === 'image' || mimeType.startsWith('image/')) {
      features = await imageFeatures(stored.bytes);
    } else if (objectType === 'text' || mimeType.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(extension(stored.storagePath))) {
      features = textFeatures(stored.bytes);
    } else {
      throw new StudioMultimodalError('UNSUPPORTED_MODALITY', `No deterministic analyzer is registered for ${objectType}/${mimeType || 'unknown'}.`, 422, { objectId, objectType, mimeType });
    }
    await persistGenericAnalysis({ objectId, jobId, object, features, warnings, engine });
    return { ok: true, reused: false, objectId, jobId, engine, status: warnings.length ? 'DEGRADED' : 'COMPLETE', featureCount: features.length, warnings };
  } catch (error) {
    const reason = error instanceof StudioMultimodalError ? error.code : 'ANALYSIS_FAILED';
    await supabase.from('studio_analysis_jobs').update({ status: reason === 'UNSUPPORTED_MODALITY' ? 'blocked' : 'failed', reason, updated_at: new Date().toISOString(), payload: { engine, error: error instanceof Error ? error.message : String(error) } }).eq('id', jobId);
    await supabase.from('studio_objects').update({ status: reason === 'UNSUPPORTED_MODALITY' ? 'blocked' : 'failed', updated_at: new Date().toISOString() }).eq('id', objectId);
    throw error;
  }
}
