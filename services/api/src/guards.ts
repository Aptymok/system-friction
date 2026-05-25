import type { CommandEnvelope, EpistemicMetadata, QueryEnvelope } from './contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isConfidence(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function hasEpistemicMetadata(value: unknown): value is EpistemicMetadata {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.epistemicClass)) return false;
  if (!isConfidence(value.confidence)) return false;
  if (value.sourceId !== undefined && !isNonEmptyString(value.sourceId)) return false;
  if (value.checksum !== undefined && !isNonEmptyString(value.checksum)) return false;
  if (value.uncertainty !== undefined && !isNonEmptyString(value.uncertainty)) return false;
  if (value.lineage !== undefined) {
    if (!Array.isArray(value.lineage)) return false;
    if (!value.lineage.every(isNonEmptyString)) return false;
  }
  return true;
}

export function isCommandEnvelope(value: unknown): value is CommandEnvelope {
  if (!isRecord(value)) return false;
  if (value.kind !== 'command') return false;
  if (value.routeCategory !== 'command' && value.routeCategory !== 'admin') return false;
  if (!isNonEmptyString(value.commandName)) return false;
  if (!isNonEmptyString(value.contractVersion)) return false;
  if (!isNonEmptyString(value.idempotencyKey)) return false;
  if (!isRecord(value.auth)) return false;
  if (!('payload' in value)) return false;
  if (value.epistemic !== undefined && !hasEpistemicMetadata(value.epistemic)) return false;
  return true;
}

export function isQueryEnvelope(value: unknown): value is QueryEnvelope {
  if (!isRecord(value)) return false;
  if (value.kind !== 'query') return false;
  if (value.routeCategory !== 'query' && value.routeCategory !== 'health') return false;
  if (!isNonEmptyString(value.queryName)) return false;
  if (!isNonEmptyString(value.contractVersion)) return false;
  if (!isRecord(value.auth)) return false;
  if (!('params' in value)) return false;
  if (value.epistemic !== undefined && !hasEpistemicMetadata(value.epistemic)) return false;
  return true;
}
