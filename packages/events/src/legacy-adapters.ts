import type { EvidenceLevel, LogRecord, SourceState } from '../../campo-ob/src';
import type { EpistemicClass, SFIEvent } from './schema';

type LegacyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LegacyRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function payloadOf(row: LegacyRecord): LegacyRecord {
  return isRecord(row.payload) ? row.payload : {};
}

function confidenceOf(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function epistemicClassOf(value: unknown): EpistemicClass {
  const candidate = stringValue(value);
  if (
    candidate === 'observed'
    || candidate === 'declared'
    || candidate === 'derived'
    || candidate === 'inferred'
    || candidate === 'simulated'
    || candidate === 'fixture'
    || candidate === 'missing'
  ) {
    return candidate;
  }
  return 'declared';
}

function evidenceLevelOf(value: unknown): EvidenceLevel {
  const candidate = stringValue(value);
  if (
    candidate === 'direct'
    || candidate === 'behavioral'
    || candidate === 'statistical'
    || candidate === 'semantic'
    || candidate === 'speculative'
    || candidate === 'none'
  ) {
    return candidate;
  }
  return 'none';
}

function fallbackConfidence(epistemicClass: EpistemicClass): number {
  switch (epistemicClass) {
    case 'observed':
      return 0.8;
    case 'declared':
      return 0.7;
    case 'derived':
      return 0.65;
    case 'inferred':
      return 0.5;
    case 'simulated':
      return 0.3;
    case 'fixture':
      return 0.2;
    case 'missing':
      return 0.1;
  }
}

function lineageOf(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const lineage = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return lineage.length ? lineage : undefined;
}

export function validateLegacyEventRow(row: unknown): boolean {
  if (!isRecord(row)) return false;
  const hasId = typeof row.id === 'string' && row.id.length > 0;
  const hasCognitiveName = typeof row.event_name === 'string' && row.event_name.length > 0;
  const hasLogbookName = typeof row.event_type === 'string' && row.event_type.length > 0;
  const hasTimestamp = typeof row.created_at === 'string' && row.created_at.length > 0;
  return hasId && hasTimestamp && (hasCognitiveName || hasLogbookName);
}

export function mapCognitiveEventStreamRowToSFIEvent(row: unknown): SFIEvent<unknown> {
  if (!validateLegacyEventRow(row) || !isRecord(row)) {
    throw new Error('invalid_legacy_cognitive_event_stream_row');
  }

  const payload = payloadOf(row);
  const epistemicClass = epistemicClassOf(payload.sourceState ?? payload.epistemicClass ?? row.stream_type);
  const confidence = confidenceOf(payload.confidence, fallbackConfidence(epistemicClass));

  return {
    eventId: String(row.id),
    eventName: String(row.event_name),
    epistemicClass,
    confidence,
    payload: row.payload ?? {},
    occurredAt: String(row.created_at),
    source: {
      sourceId: stringValue(row.emitted_by) ?? stringValue(payload.sourceId) ?? 'legacy:cognitive_event_stream',
      sourceType: stringValue(row.stream_type) ?? 'legacy',
    },
    checksum: stringValue(payload.checksum) ?? stringValue(payload.hash),
    lineage: lineageOf(payload.lineage ?? payload.inference_chain),
    uncertainty: stringValue(payload.uncertainty),
  };
}

export function mapSfiLogbookRowToLogRecord(row: unknown): LogRecord {
  if (!validateLegacyEventRow(row) || !isRecord(row)) {
    throw new Error('invalid_legacy_sfi_logbook_row');
  }

  const payload = payloadOf(row);
  const sourceState: SourceState = epistemicClassOf(payload.sourceState ?? payload.epistemicClass);
  const evidenceLevel = evidenceLevelOf(payload.evidenceLevel);
  const confidence = confidenceOf(payload.confidence, fallbackConfidence(sourceState));
  const createdAt = String(row.created_at);

  return {
    id: String(row.id),
    nodeId: stringValue(row.node_id) ?? stringValue(payload.node_id) ?? 'unknown',
    logbookId: stringValue(row.asset_id) ?? stringValue(payload.asset_id),
    eventName: String(row.event_type),
    payloadHash: stringValue(row.hash) ?? stringValue(payload.hash) ?? 'missing',
    createdAt,
    sourceState,
    evidenceLevel,
    confidence,
    updatedAt: stringValue(row.updated_at) ?? createdAt,
  };
}
