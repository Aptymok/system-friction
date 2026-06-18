import crypto from 'crypto';
import { normalizeWorldSpectLensDomain } from '@/lib/worldspect/vector-contract';
import type { ScoreFrictionObject } from './object-friction-contract';
import type { ScoreFrictionGenerationRequest, ScoreFrictionNormalizedObservation, ScoreFrictionObjectKind, ScoreFrictionObservationInput } from './types';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function inferScoreFrictionObjectKind(input: ScoreFrictionObservationInput, raw: Record<string, unknown> = record(input.raw_payload)): ScoreFrictionObjectKind {
  if ((input as any).object_kind) return (input as any).object_kind;
  const rawKind = text(raw.object_kind) ?? text(raw.objectKind) ?? text(raw.kind) ?? text(raw.type);
  if (rawKind === 'audio' || rawKind === 'text' || rawKind === 'image' || rawKind === 'video' || rawKind === 'json' || rawKind === 'dataset' || rawKind === 'url' || rawKind === 'document' || rawKind === 'campaign' || rawKind === 'mixed_media') return rawKind;
  const mime = text(raw.mime_type) ?? text(raw.mimeType);
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime?.startsWith('image/')) return 'image';
  if (mime?.startsWith('video/')) return 'video';
  const sourceUrl = text(raw.source_url) ?? text(raw.sourceUrl) ?? input.source_url;
  if (sourceUrl?.startsWith('http://') || sourceUrl?.startsWith('https://')) return 'url';
  if (input.lyrics || raw.lyrics) return 'text';
  if (raw.rows || raw.records || raw.dataset) return 'dataset';
  if (raw.markdown || raw.document || raw.file_name || raw.fileName) return 'document';
  return 'text';
}

export function requestedGeneration(value: unknown): ScoreFrictionGenerationRequest {
  if (value === false || value === null || typeof value === 'undefined') return false;
  if (value === 'strategy' || value === 'image_prompt' || value === 'video_prompt' || value === 'copy' || value === 'storyboard' || value === 'campaign') return value;
  return false;
}

export function scoreFrictionObjectFromNormalized(normalized: ScoreFrictionNormalizedObservation): ScoreFrictionObject {
  return {
    objectId: normalized.contentFingerprint ?? normalized.sourceUrl ?? normalized.sourceName ?? 'unknown',
    kind: (normalized.objectKind ?? 'unknown') as any,
    label: normalized.objectLabel ?? normalized.sourceName ?? 'untitled',
    sourceName: normalized.sourceName,
    sourceUrl: normalized.sourceUrl,
    territory: normalized.territory,
    semanticText: normalized.semanticText ?? null,
    metadata: normalized.metadata,
    contentFingerprint: normalized.contentFingerprint ?? normalized.sourceUrl ?? normalized.sourceName ?? 'unknown',
    observedAt: normalized.collectedAt,
  };
}

export function scoreFrictionLensFromInput(input: ScoreFrictionObservationInput) {
  return normalizeWorldSpectLensDomain((input as any).selected_worldspect_domain ?? record(input.raw_payload).selected_worldspect_domain ?? record(input.raw_payload).selectedWorldSpectDomain ?? 'CULTURAL');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = canonicalize((value as Record<string, unknown>)[key]);
    return acc;
  }, {});
}

export function fingerprintObject(input: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(input))).digest('hex').slice(0, 24);
}



