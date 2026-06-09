import crypto from 'crypto';
import type { ScoreFrictionNormalizedObservation, ScoreFrictionObservationInput, ScoreFrictionVectors } from './types';
import { mapMihmCulturalVector } from './mihm-cultural-mapper';

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = canonicalize((value as Record<string, unknown>)[key]);
    return acc;
  }, {});
}

export function evidenceHash(value: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function commentsFrom(value: unknown): Array<{ body: string; timestamp?: number | string | null }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [{ body: item.trim(), timestamp: null }];
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const body = text(record.body) ?? text(record.text) ?? text(record.comment);
    return body ? [{ body, timestamp: record.timestamp as number | string | null | undefined }] : [];
  });
}

function tagsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter((item): item is string => Boolean(item)).slice(0, 24);
  const asText = text(value);
  return asText ? asText.split(/[,\s#]+/).map((item) => item.trim()).filter(Boolean).slice(0, 24) : [];
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sourceFrom(input: ScoreFrictionObservationInput, raw: Record<string, unknown>) {
  const rawSource = text(raw.source_name) ?? text(raw.sourceName);
  if (input.source_name) return input.source_name;
  if (rawSource) return rawSource;
  if (input.soundcloudUrl || text(raw.soundcloudUrl)) return 'soundcloud_public_v2';
  if (input.tiktokUrl || text(raw.tiktokUrl)) return 'tiktok_research_alternative';
  if (input.youtubeUrl || text(raw.youtubeUrl)) return 'youtube_public_v1';
  if (input.spotifyUrl || text(raw.spotifyUrl)) return 'spotify_public_v1';
  if (input.lyrics || raw.lyrics) return 'genius';
  return 'manual_upload';
}

function urlFrom(input: ScoreFrictionObservationInput, raw: Record<string, unknown>) {
  return input.source_url
    ?? text(raw.source_url)
    ?? text(raw.sourceUrl)
    ?? input.soundcloudUrl
    ?? text(raw.soundcloudUrl)
    ?? input.tiktokUrl
    ?? text(raw.tiktokUrl)
    ?? input.youtubeUrl
    ?? text(raw.youtubeUrl)
    ?? input.spotifyUrl
    ?? text(raw.spotifyUrl)
    ?? null;
}

function caseIdFrom(input: ScoreFrictionObservationInput, raw: Record<string, unknown>) {
  return input.case_id ?? text(raw.case_id) ?? text(raw.caseId) ?? input.caseStudy ?? text(raw.caseStudy) ?? null;
}

function sourceAccessFrom(input: ScoreFrictionObservationInput, raw: Record<string, unknown>) {
  const analysisMode = text(raw.analysis_mode) ?? text(raw.analysisMode);
  const sourceAccess = text(recordFrom(raw.metadata).sourceAccess);
  if (analysisMode) return analysisMode;
  if (sourceAccess) return sourceAccess;
  if (input.source_url ?? raw.source_url ?? raw.sourceUrl) return 'url_observation';
  return 'manual_or_connector';
}

export function normalizeObservation(input: ScoreFrictionObservationInput): ScoreFrictionNormalizedObservation {
  const raw = input.raw_payload ?? {};
  const sourceName = sourceFrom(input, raw);
  const comments = commentsFrom(input.comments ?? raw.comments);
  const metadata = recordFrom(raw.metadata);
  const audioMetadata = input.audioMetadata
    ?? recordFrom(raw.audioMetadata)
    ?? recordFrom(metadata.audioMetadata);

  return {
    title: text(raw.title) ?? text(raw.name) ?? text(raw.sound_title),
    artist: text(raw.artist) ?? text((raw.user as Record<string, unknown> | undefined)?.username) ?? text(raw.channel),
    sourceName,
    sourceUrl: urlFrom(input, raw),
    territory: input.territory ?? text(raw.territory) ?? text(raw.region) ?? 'MX',
    caseId: caseIdFrom(input, raw),
    lyrics: input.lyrics ?? text(raw.lyrics),
    comments,
    metrics: {
      playback_count: num(raw.playback_count ?? raw.playCount ?? raw.views ?? raw.viewCount),
      likes_count: num(raw.likes_count ?? raw.likeCount),
      reposts_count: num(raw.reposts_count ?? raw.reposts ?? raw.share_count),
      comments_count: num(raw.comments_count ?? raw.comment_count ?? raw.commentCount ?? comments.length),
      video_count: num(raw.video_count),
      duration_ms: num(raw.duration_ms ?? raw.duration),
      tempo_bpm: num(audioMetadata.tempo_bpm),
      rms_energy: num(audioMetadata.rms_energy),
    },
    tags: [...tagsFrom(raw.tags), ...tagsFrom(raw.tag_list), ...tagsFrom(raw.genre)].slice(0, 24),
    metadata: {
      description: text(raw.description) ?? text(raw.caption),
      waveform_url: text(raw.waveform_url) ?? text(metadata.waveform_url),
      audioMetadata,
      sourceAccess: sourceAccessFrom(input, raw),
      analysisMode: text(raw.analysis_mode) ?? text(raw.analysisMode) ?? null,
      observationGoal: text(raw.observation_goal) ?? text(raw.observationGoal) ?? null,
      focusVariables: Array.isArray(raw.focus_variables) ? raw.focus_variables : [],
    },
    collectedAt: text(raw.collected_at) ?? text(raw.collectedAt) ?? new Date().toISOString(),
  };
}

function wordStats(textBlock: string | null) {
  const words = (textBlock ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const unique = new Set(words);
  return { total: words.length, unique: unique.size, diversity: words.length ? unique.size / words.length : 0 };
}

export function deriveVectors(normalized: ScoreFrictionNormalizedObservation): ScoreFrictionVectors {
  const lyricStats = wordStats(normalized.lyrics);
  const commentStats = wordStats(normalized.comments.map((comment) => comment.body).join(' '));
  const totalEngagement = normalized.metrics.likes_count + normalized.metrics.reposts_count + normalized.metrics.comments_count;
  const playback = Math.max(1, normalized.metrics.playback_count);
  const engagementRate = totalEngagement / playback;
  const commentsRate = normalized.metrics.comments_count / playback;
  const tagDrift = clamp01(normalized.tags.length / 18);
  const waveformPresent = normalized.metadata.waveform_url ? 1 : 0;

  const acoustic_vector = {
    tempo_bpm: normalized.metrics.tempo_bpm,
    rms_energy: clamp01(normalized.metrics.rms_energy),
    duration_pressure: clamp01(normalized.metrics.duration_ms / 240000),
    waveform_presence: waveformPresent,
  };
  const semantic_vector = {
    semantic_density: clamp01(lyricStats.total / 260),
    lexical_diversity: clamp01(lyricStats.diversity),
    repetition_load: clamp01(1 - lyricStats.diversity),
    comment_semantic_echo: clamp01(commentStats.total / 180),
  };
  const memetic_vector = {
    fragmentability_score: clamp01((normalized.metrics.video_count / 1000) + engagementRate * 6),
    caption_reuse_score: clamp01(commentStats.diversity ? 1 - commentStats.diversity : 0),
    sound_memetic_velocity: clamp01(normalized.metrics.reposts_count / playback * 10),
    ritualization_index: clamp01((normalized.metrics.video_count / 5000) + commentsRate * 5),
  };
  const platform_vector = {
    public_reception_vector: clamp01(engagementRate * 8),
    comment_conflict_score: clamp01(normalized.comments.filter((comment) => /no|odio|mal|fake|copia|pelea/i.test(comment.body)).length / Math.max(1, normalized.comments.length)),
    identity_resonance_score: clamp01(normalized.comments.filter((comment) => /yo|nosotros|barrio|mex|mx|familia|ciudad/i.test(comment.body)).length / Math.max(1, normalized.comments.length)),
    genre_tag_drift: tagDrift,
    underground_signal_strength: clamp01((waveformPresent * 0.2) + tagDrift * 0.4 + engagementRate * 4),
  };

  return {
    acoustic_vector,
    semantic_vector,
    memetic_vector,
    platform_vector,
    mihm_cultural_vector: mapMihmCulturalVector({ acoustic_vector, semantic_vector, memetic_vector, platform_vector }),
  };
}
