import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '../../runtime/supabase/server';
import { executeAbortableQuery } from '@/lib/supabase/abortableQuery';
import type {
  WorldSpectIngestMode,
  WorldSpectFieldStateSignal,
  WorldSpectResponse,
  WorldSpectSource,
  WorldSpectSourceHealth,
  WorldSpectSourceState,
} from '../../../packages/api-contracts/src';
import type { WorldSpectCanonicalPayload } from './contract';
import { deriveWorldSpectSourceHealth } from './contract';

type PersistedWorldSpectSourceState = Exclude<WorldSpectSourceState, 'missing'>;

export type WorldSpectSnapshotInput = {
  sourceState: PersistedWorldSpectSourceState;
  evidenceLevel: 'direct';
  confidence: number;
  wsi: number | null;
  nti: number | null;
  ts: string;
  sources: WorldSpectSource[];
  degraded_sources: string[];
  sourceHealth: WorldSpectSourceHealth[];
  fieldStateSignal: Record<string, unknown> | null;
  rawPayload: unknown;
  adapterStatus: 'observed' | 'degraded' | 'failed';
  adapterError?: string | null;
  ingestMode: WorldSpectIngestMode;
};

export type WorldSpectSnapshotRow = {
  id: string;
  observed_at: string;
  created_at: string;
  source_state: PersistedWorldSpectSourceState;
  evidence_level: 'direct';
  confidence: number;
  wsi: number | null;
  nti: number | null;
  degraded_sources: string[];
  sources: WorldSpectSource[];
  source_health: WorldSpectSourceHealth[];
  raw_payload: WorldSpectCanonicalPayload;
  field_state_signal: WorldSpectFieldStateSignal;
  adapter_status: string;
  adapter_error: string | null;
  ingest_mode: WorldSpectIngestMode;
  snapshot_hash: string;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

function hashSnapshot(input: WorldSpectSnapshotInput) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize({
      sourceState: input.sourceState,
      evidenceLevel: input.evidenceLevel,
      confidence: input.confidence,
      wsi: input.wsi,
      nti: input.nti,
      ts: input.ts,
      sources: input.sources,
      degraded_sources: input.degraded_sources,
      sourceHealth: input.sourceHealth,
      rawPayload: input.rawPayload,
      adapterStatus: input.adapterStatus,
      adapterError: input.adapterError ?? null,
      ingestMode: input.ingestMode,
    })))
    .digest('hex');
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function numberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWorldSpectSourceState(value: unknown): value is PersistedWorldSpectSourceState {
  return value === 'observed' || value === 'degraded';
}

function isWorldSpectIngestMode(value: unknown): value is WorldSpectIngestMode {
  return value === 'daily_cron' || value === 'manual' || value === 'diagnostic' || value === 'fallback_runtime';
}

export async function getLatestWorldSpectSnapshot() {
  const service = createServiceSupabaseClient();

  const { data, error } = await executeAbortableQuery(service
    .from('worldspect_snapshots')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle());

  if (error || !data) return null;

  const sourceState = isWorldSpectSourceState(data.source_state) ? data.source_state : 'degraded';
  const ingestMode = isWorldSpectIngestMode(data.ingest_mode) ? data.ingest_mode : 'manual';

  return {
    id: String(data.id),
    observed_at: String(data.observed_at),
    created_at: String(data.created_at),
    source_state: sourceState,
    evidence_level: 'direct',
    confidence: clamp01(Number(data.confidence ?? 0)),
    wsi: numberOrNull(data.wsi),
    nti: numberOrNull(data.nti),
    degraded_sources: Array.isArray(data.degraded_sources) ? data.degraded_sources.filter((source: unknown): source is string => typeof source === 'string') : [],
    sources: Array.isArray(data.sources) ? data.sources as WorldSpectSource[] : [],
    source_health: Array.isArray(data.source_health) && data.source_health.length > 0
      ? data.source_health as WorldSpectSourceHealth[]
      : deriveWorldSpectSourceHealth(
        Array.isArray(data.sources) ? data.sources as WorldSpectSource[] : [],
        Array.isArray(data.degraded_sources) ? data.degraded_sources.filter((source: unknown): source is string => typeof source === 'string') : [],
        String(data.observed_at),
      ),
    raw_payload: data.raw_payload as WorldSpectCanonicalPayload,
    field_state_signal: data.field_state_signal && typeof data.field_state_signal === 'object' ? data.field_state_signal as WorldSpectFieldStateSignal : null,
    adapter_status: String(data.adapter_status ?? 'unknown'),
    adapter_error: typeof data.adapter_error === 'string' ? data.adapter_error : null,
    ingest_mode: ingestMode,
    snapshot_hash: String(data.snapshot_hash ?? ''),
  } satisfies WorldSpectSnapshotRow;
}

export async function upsertWorldSpectSnapshot(input: WorldSpectSnapshotInput) {
  const service = createServiceSupabaseClient();
  const observedAt = new Date(input.ts || Date.now()).toISOString();

  const row = {
    observed_at: observedAt,
    source_state: input.sourceState,
    evidence_level: input.evidenceLevel,
    confidence: clamp01(input.confidence),
    wsi: input.wsi,
    nti: input.nti,
    degraded_sources: input.degraded_sources,
    sources: input.sources,
    source_health: input.sourceHealth,
    raw_payload: input.rawPayload,
    field_state_signal: input.fieldStateSignal,
    adapter_status: input.adapterStatus,
    adapter_error: input.adapterError ?? null,
    ingest_mode: input.ingestMode,
    snapshot_hash: hashSnapshot(input),
  };

  const { data, error } = await executeAbortableQuery(service
    .from('worldspect_snapshots')
    .upsert(row, {
      onConflict: 'unique_date,ingest_mode',
    })
    .select('*')
    .single(), 5000);

  if (error) {
    return { ok: false as const, error: 'worldspect_snapshot_persist_failed', details: error.message };
  }

  return { ok: true as const, data };
}

export function snapshotRowToApiData(row: WorldSpectSnapshotRow) {
  return {
    sourceState: row.source_state,
    evidenceLevel: row.evidence_level,
    confidence: row.confidence,
    wsi: row.wsi,
    nti: row.nti,
    ts: row.observed_at,
    sources: row.sources,
    degraded_sources: row.degraded_sources,
    sourceHealth: row.source_health,
    fieldStateSignal: row.field_state_signal,
    snapshot: {
      id: row.id,
      observedAt: row.observed_at,
      createdAt: row.created_at,
      ingestMode: row.ingest_mode,
      adapterStatus: row.adapter_status,
      adapterError: row.adapter_error,
      snapshotHash: row.snapshot_hash,
      persisted: true,
    },
  } satisfies WorldSpectResponse;
}
