import crypto from 'node:crypto';
import { calculateEvidenceTrust, calculateLdiFromAge } from './math';

export type EvidenceKind =
  | 'document'
  | 'audio'
  | 'image'
  | 'video'
  | 'json'
  | 'url'
  | 'text'
  | 'session'
  | 'metric'
  | 'unknown';

export type EvidenceTrustLevel = 'verified' | 'declared' | 'inferred' | 'simulated' | 'unknown';

export type EvidenceEnvelope = {
  id?: string;
  kind: EvidenceKind;
  sourceName: string;
  sourceUrl?: string | null;
  uploadedBy?: string | null;
  observedAt: string;
  hash: string;
  anonymized: boolean;
  trustLevel: EvidenceTrustLevel;
  trustScore: number;
  ldi: number;
  privateRef?: string | null;
  publicWeight: number;
  payloadSummary: Record<string, unknown>;
};

export function sha256(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function classifyEvidenceKind(filenameOrUrl: string): EvidenceKind {
  const s = filenameOrUrl.toLowerCase();
  if (/^https?:\/\//.test(s)) return 'url';
  if (s.endsWith('.json')) return 'json';
  if (s.endsWith('.txt') || s.endsWith('.md')) return 'text';
  if (s.endsWith('.mp3') || s.endsWith('.wav') || s.endsWith('.m4a') || s.endsWith('.mid') || s.endsWith('.midi')) return 'audio';
  if (s.endsWith('.png') || s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.webp')) return 'image';
  if (s.endsWith('.mp4') || s.endsWith('.mov') || s.endsWith('.webm')) return 'video';
  if (s.endsWith('.pdf') || s.endsWith('.docx')) return 'document';
  return 'unknown';
}

export function createEvidenceEnvelope(input: {
  kind?: EvidenceKind;
  sourceName: string;
  sourceUrl?: string | null;
  uploadedBy?: string | null;
  observedAt?: string;
  raw: string | Buffer;
  verified?: boolean;
  sourceCount?: number;
  anonymized?: boolean;
  payloadSummary?: Record<string, unknown>;
  privateRef?: string | null;
}): EvidenceEnvelope {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const ageHours = Math.max(0, (Date.now() - new Date(observedAt).getTime()) / 36e5);
  const hash = sha256(input.raw);

  const trustScore = calculateEvidenceTrust({
    verified: Boolean(input.verified),
    sourceCount: input.sourceCount ?? 1,
    hasHash: true,
    hasTimestamp: true,
    hasOperator: Boolean(input.uploadedBy),
    ageHours,
  });

  const trustLevel: EvidenceTrustLevel =
    input.verified ? 'verified' :
    trustScore >= 0.55 ? 'declared' :
    trustScore >= 0.30 ? 'inferred' :
    'unknown';

  const ldi = calculateLdiFromAge(ageHours);

  return {
    kind: input.kind ?? classifyEvidenceKind(input.sourceName),
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl ?? null,
    uploadedBy: input.uploadedBy ?? null,
    observedAt,
    hash,
    anonymized: input.anonymized ?? true,
    trustLevel,
    trustScore,
    ldi,
    privateRef: input.privateRef ?? null,
    publicWeight: trustScore * (1 - ldi),
    payloadSummary: input.payloadSummary ?? {},
  };
}
