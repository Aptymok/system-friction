import { createHash } from 'crypto';

export function normalizeSignalContent(value: unknown): string {
  if (typeof value === 'string') {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  if (value === null || value === undefined) return '';

  try {
    return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  } catch {
    return String(value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

export function inferSignalHash(input: { label?: string; content?: string; content_hash?: string; source_type?: string; source_id?: string }): string {
  const explicitHash = normalizeSignalContent(input.content_hash);
  if (explicitHash) return explicitHash;

  const identity = [
    normalizeSignalContent(input.label),
    normalizeSignalContent(input.content),
    normalizeSignalContent(input.source_type),
    normalizeSignalContent(input.source_id),
  ].join('|');

  return createHash('sha256').update(identity).digest('hex');
}

export function clamp01(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}
