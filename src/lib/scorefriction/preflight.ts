import { normalizeObservation } from './normalize';
import type { ScoreFrictionObservationInput } from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function hasAnyMetric(raw: Record<string, unknown>) {
  return ['playback_count', 'likes_count', 'reposts_count', 'comments_count', 'views', 'viewCount', 'likeCount', 'commentCount']
    .some((key) => Number(raw[key] ?? 0) > 0);
}

export function preflightScoreFrictionObservation(input: ScoreFrictionObservationInput) {
  const raw = record(input.raw_payload);
  const normalized = normalizeObservation(input);
  const missing: string[] = [];
  const warnings: string[] = [];
  const sourceUrl = normalized.sourceUrl;
  const title = normalized.title;
  const artist = normalized.artist;
  const hasUrl = Boolean(sourceUrl);
  const isHttpUrl = sourceUrl?.startsWith('http://') || sourceUrl?.startsWith('https://');
  const isUpload = sourceUrl?.startsWith('upload://');
  const hasAudio = Boolean(record(normalized.metadata.audioMetadata).tempo_bpm || record(normalized.metadata.audioMetadata).rms_energy);
  const hasComments = normalized.comments.length > 0;
  const hasMetrics = hasAnyMetric(raw);
  const hasDescription = Boolean(normalized.metadata.description);

  if (!normalized.caseId) missing.push('case_id');
  if (!normalized.sourceName) missing.push('source_name');
  if (!sourceUrl && !title) missing.push('source_url_or_title');
  if (!title) missing.push('title');
  if (!artist) missing.push('artist');
  if (!hasMetrics) missing.push('platform_metrics');
  if (!hasComments) missing.push('comments');

  if (isHttpUrl && !hasMetrics && !title) warnings.push('url_preserved_but_not_resolved');
  if (isUpload && !hasAudio) warnings.push('upload_without_audio_measurement');
  if (normalized.metadata.sourceAccess === 'audio_file_analysis' && !hasAudio) warnings.push('audio_analysis_degraded');

  const evidenceSignals = [hasUrl, Boolean(title), Boolean(artist), hasDescription, hasComments, hasMetrics, hasAudio].filter(Boolean).length;
  const evidenceLevel = evidenceSignals >= 5 ? 'observable' : evidenceSignals >= 3 ? 'partial' : evidenceSignals >= 1 ? 'minimal' : 'empty';
  const canEvaluate = evidenceLevel !== 'empty';
  const canRecord = Boolean(normalized.caseId && normalized.sourceName && (sourceUrl || title));
  const canPropose = canRecord && evidenceLevel === 'observable' && hasMetrics && (hasComments || hasAudio);

  return {
    ok: true as const,
    canEvaluate,
    canRecord,
    canPropose,
    evidenceLevel,
    missing,
    warnings,
    normalizedPreview: normalized,
    route: canPropose ? 'propose_candidate' : canRecord ? 'record_observation' : canEvaluate ? 'evaluate_only' : 'enrich_evidence',
  };
}
