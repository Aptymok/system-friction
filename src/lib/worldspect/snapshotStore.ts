import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
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
type RecentWorldSpectIngestMode = WorldSpectIngestMode | 'all';

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

function normalizeWorldSpectSnapshotRow(data: Record<string, any>): WorldSpectSnapshotRow {
  const sourceState = isWorldSpectSourceState(data.source_state) ? data.source_state : 'degraded';
  const ingestMode = isWorldSpectIngestMode(data.ingest_mode) ? data.ingest_mode : 'manual';
  const observedAt = String(data.observed_at);
  const sources = Array.isArray(data.sources) ? data.sources as WorldSpectSource[] : [];
  const degradedSources = Array.isArray(data.degraded_sources)
    ? data.degraded_sources.filter((source: unknown): source is string => typeof source === 'string')
    : [];

  return {
    id: String(data.id),
    observed_at: observedAt,
    created_at: String(data.created_at),
    source_state: sourceState,
    evidence_level: 'direct',
    confidence: clamp01(Number(data.confidence ?? 0)),
    wsi: numberOrNull(data.wsi),
    nti: numberOrNull(data.nti),
    degraded_sources: degradedSources,
    sources,
    source_health: Array.isArray(data.source_health) && data.source_health.length > 0
      ? data.source_health as WorldSpectSourceHealth[]
      : deriveWorldSpectSourceHealth(sources, degradedSources, observedAt),
    raw_payload: data.raw_payload as WorldSpectCanonicalPayload,
    field_state_signal: data.field_state_signal && typeof data.field_state_signal === 'object' ? data.field_state_signal as WorldSpectFieldStateSignal : null,
    adapter_status: String(data.adapter_status ?? 'unknown'),
    adapter_error: typeof data.adapter_error === 'string' ? data.adapter_error : null,
    ingest_mode: ingestMode,
    snapshot_hash: String(data.snapshot_hash ?? ''),
  } satisfies WorldSpectSnapshotRow;
}

function localSnapshotFilePath() {
  return process.env.WORLDSPECT_LOCAL_SNAPSHOT_FILE
    ?? path.join(process.env.SFI_RUNTIME_DIR ?? path.join(process.cwd(), '.sfi_runtime'), 'worldspect_snapshots.json');
}

function snapshotDateKey(value: string) {
  return value.slice(0, 10);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function readLocalWorldSpectSnapshots(): Promise<WorldSpectSnapshotRow[]> {
  try {
    const file = localSnapshotFilePath();
    const content = await readFile(file, 'utf8');
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.snapshots) ? parsed.snapshots : [];

    return rows
      .filter((row: unknown): row is Record<string, any> => Boolean(row) && typeof row === 'object')
      .map((row) => normalizeWorldSpectSnapshotRow(row))
      .sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  } catch {
    return [];
  }
}

async function writeLocalWorldSpectSnapshot(row: Record<string, unknown>) {
  const file = localSnapshotFilePath();
  const now = new Date().toISOString();
  const snapshotHash = String(row.snapshot_hash ?? createHash('sha256').update(JSON.stringify(canonicalize(row))).digest('hex'));
  const observedAt = String(row.observed_at ?? now);
  const ingestMode = isWorldSpectIngestMode(row.ingest_mode) ? row.ingest_mode : 'manual';

  const localRow = normalizeWorldSpectSnapshotRow({
    id: `local_${snapshotHash.slice(0, 16)}`,
    created_at: now,
    ...row,
    observed_at: observedAt,
    ingest_mode: ingestMode,
    snapshot_hash: snapshotHash,
  });

  const existing = await readLocalWorldSpectSnapshots();
  const next = [
    ...existing.filter((candidate) => (
      snapshotDateKey(candidate.observed_at) !== snapshotDateKey(localRow.observed_at)
      || candidate.ingest_mode !== localRow.ingest_mode
    )),
    localRow,
  ].sort((a, b) => a.observed_at.localeCompare(b.observed_at));

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2), 'utf8');

  return localRow;
}

export async function getLatestWorldSpectSnapshot() {
  try {
    const service = createServiceSupabaseClient();

    const { data, error } = await executeAbortableQuery(service
      .from('worldspect_snapshots')
      .select('*')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle());

    if (!error && data) return normalizeWorldSpectSnapshotRow(data);
  } catch {
    // Supabase is the primary store, but local hub operation must remain observable
    // during local network/proxy/service-role outages.
  }

  const local = await readLocalWorldSpectSnapshots();
  return local.length > 0 ? local[local.length - 1] : null;
}

export async function getRecentWorldSpectSnapshots(input?: {
  days?: number;
  ingestMode?: RecentWorldSpectIngestMode;
  limit?: number;
}) {
  const days = Number.isFinite(input?.days) ? Math.max(1, Number(input?.days)) : 90;
  const ingestMode = input?.ingestMode ?? 'all';
  const limit = Number.isFinite(input?.limit) ? Math.max(1, Number(input?.limit)) : 120;
  const observedSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const service = createServiceSupabaseClient();
    let query = service
      .from('worldspect_snapshots')
      .select('*')
      .gte('observed_at', observedSince);

    if (ingestMode !== 'all' && isWorldSpectIngestMode(ingestMode)) {
      query = query.eq('ingest_mode', ingestMode);
    }

    const { data, error } = await executeAbortableQuery(query
      .order('observed_at', { ascending: true })
      .limit(limit));

    if (!error && Array.isArray(data)) {
      return data.map((row) => normalizeWorldSpectSnapshotRow(row));
    }
  } catch {
    // Read-through fallback below.
  }

  const local = await readLocalWorldSpectSnapshots();
  return local
    .filter((row) => row.observed_at >= observedSince)
    .filter((row) => ingestMode === 'all' || row.ingest_mode === ingestMode)
    .slice(-limit);
}

export async function upsertWorldSpectSnapshot(input: WorldSpectSnapshotInput) {
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

  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await executeAbortableQuery(service
      .from('worldspect_snapshots')
      .upsert(row, {
        onConflict: 'unique_date,ingest_mode',
      })
      .select('*')
      .single(), 5000);

    if (!error) {
      return { ok: true as const, data, target: 'supabase' as const };
    }

    const local = await writeLocalWorldSpectSnapshot(row);
    return {
      ok: true as const,
      data: local,
      target: 'local_runtime' as const,
      warning: 'supabase_persist_failed_local_runtime_used',
      supabase_error: error.message,
    };
  } catch (error) {
    try {
      const local = await writeLocalWorldSpectSnapshot(row);
      return {
        ok: true as const,
        data: local,
        target: 'local_runtime' as const,
        warning: 'supabase_unreachable_local_runtime_used',
        supabase_error: errorMessage(error),
      };
    } catch (localError) {
      return {
        ok: false as const,
        error: 'worldspect_snapshot_persist_failed',
        details: errorMessage(error),
        local_details: errorMessage(localError),
      };
    }
  }
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
      persistenceTarget: row.id.startsWith('local_') ? 'local_runtime' : 'supabase',
    },
  } satisfies WorldSpectResponse;
}
