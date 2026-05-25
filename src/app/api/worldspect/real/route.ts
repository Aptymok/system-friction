import { NextResponse } from 'next/server';
import type { ApiResult, SourceHealthDTO } from '../../../../../packages/api-contracts/src';
import { runWorldSpectrum, type WorldSpectrumCliPayload, type WorldSpectrumSource } from '@/lib/worldspect/runWorldSpectrum';
import {
  getLatestWorldSpectSnapshot,
  snapshotRowToApiData,
  upsertWorldSpectSnapshot,
  type WorldSpectSnapshotRow,
} from '@/lib/worldspect/snapshotStore';

export const runtime = 'nodejs';

type WorldSpectRealSourceState = 'observed' | 'degraded';

type WorldSpectRealResponse = {
  sourceState: WorldSpectRealSourceState;
  evidenceLevel: 'direct';
  confidence: number;
  wsi: number | null;
  nti: number | null;
  ts: string;
  sources: WorldSpectrumSource[];
  degraded_sources: string[];
  sourceHealth: SourceHealthDTO[];
  fieldStateSignal: {
    sourceState: WorldSpectRealSourceState;
    evidenceLevel: 'direct';
    confidence: number;
    metrics: {
      wsi: number;
      nti: number;
    };
    observedAt: string;
    sourceIds: string[];
  } | null;
  snapshot?: {
    id: string;
    observedAt: string;
    createdAt: string;
    ingestMode: string;
    adapterStatus: string;
    adapterError: string | null;
    snapshotHash: string;
    persisted: boolean;
  };
};

function apiOk<TData>(data: TData, warnings?: string[]) {
  const result: ApiResult<TData> = { ok: true, data, warnings };
  return NextResponse.json(result);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isRealSource(source: WorldSpectrumSource) {
  return source.value !== null && source.simulated !== true && !source.error;
}

function isEmptyDegradedSnapshot(snapshot: WorldSpectSnapshotRow) {
  return snapshot.source_state === 'degraded'
    && snapshot.confidence === 0
    && snapshot.wsi === null
    && snapshot.nti === null
    && snapshot.sources.length === 0
    && snapshot.source_health.length === 0;
}

function sourceStatus(source: WorldSpectrumSource, degradedSources: string[]): SourceHealthDTO['status'] {
  if (degradedSources.includes(source.key)) return 'degraded';
  if (source.error || source.simulated === true) return 'degraded';
  if (source.value === null) return 'unavailable';
  return 'healthy';
}

function sourceConfidence(source: WorldSpectrumSource) {
  if (!isRealSource(source)) return 0;
  if (typeof source.nti === 'number' && Number.isFinite(source.nti)) return clamp01(source.nti);
  return 0.7;
}

function calculateConfidence(payload: WorldSpectrumCliPayload) {
  if (payload.sources.length === 0) return 0;
  const realSources = payload.sources.filter(isRealSource);
  const sourceCoverage = realSources.length / payload.sources.length;
  const metricCoverage = typeof payload.wsi === 'number' && typeof payload.nti === 'number' ? 1 : 0.65;
  const degradationPenalty = payload.degraded_sources.length > 0 ? 0.82 : 1;
  return Number(clamp01(sourceCoverage * metricCoverage * degradationPenalty).toFixed(3));
}

function toSourceHealth(payload: WorldSpectrumCliPayload): SourceHealthDTO[] {
  return payload.sources.map((source) => ({
    sourceId: source.key,
    status: sourceStatus(source, payload.degraded_sources),
    kind: 'public-api',
    lastObservedAt: source.ts,
    checkedAt: payload.ts,
    confidence: sourceConfidence(source),
    message: source.error ? source.error : undefined,
  }));
}

function toResponse(payload: WorldSpectrumCliPayload, sourceState: WorldSpectRealSourceState): WorldSpectRealResponse {
  const confidence = calculateConfidence(payload);
  const sourceHealth = toSourceHealth(payload);
  const hasMeasuredMetrics = typeof payload.wsi === 'number' && typeof payload.nti === 'number';

  return {
    sourceState,
    evidenceLevel: 'direct',
    confidence,
    wsi: payload.wsi,
    nti: payload.nti,
    ts: payload.ts,
    sources: payload.sources,
    degraded_sources: payload.degraded_sources,
    sourceHealth,
    fieldStateSignal: hasMeasuredMetrics
      ? {
        sourceState,
        evidenceLevel: 'direct',
        confidence,
        metrics: {
          wsi: payload.wsi as number,
          nti: payload.nti as number,
        },
        observedAt: payload.ts,
        sourceIds: payload.sources.filter(isRealSource).map((source) => source.key),
      }
      : null,
  };
}

export async function GET() {
  const latest = await getLatestWorldSpectSnapshot();

  if (latest && !isEmptyDegradedSnapshot(latest)) {
    return apiOk(snapshotRowToApiData(latest));
  }

  const result = await runWorldSpectrum();
  const sourceState: WorldSpectRealSourceState = result.status === 'observed' ? 'observed' : 'degraded';
  const response = toResponse(result.payload, sourceState);

  const persisted = await upsertWorldSpectSnapshot({
    sourceState: response.sourceState,
    evidenceLevel: response.evidenceLevel,
    confidence: response.confidence,
    wsi: response.wsi,
    nti: response.nti,
    ts: response.ts,
    sources: response.sources,
    degraded_sources: response.degraded_sources,
    sourceHealth: response.sourceHealth,
    fieldStateSignal: response.fieldStateSignal,
    rawPayload: result.payload,
    adapterStatus: result.ok ? result.status : 'failed',
    adapterError: result.ok ? null : result.errorCode,
    ingestMode: 'fallback_runtime',
  });

  const warnings = [
    latest ? 'worldspect_empty_degraded_snapshot_refreshed' : 'worldspect_snapshot_missing_used_runtime_fallback',
    ...(result.ok ? [] : [result.errorCode]),
    ...(persisted.ok ? [] : [persisted.error]),
  ];

  return apiOk({
    ...response,
    snapshot: {
      id: persisted.ok && typeof persisted.data?.id === 'string' ? persisted.data.id : 'unpersisted',
      observedAt: response.ts,
      createdAt: new Date().toISOString(),
      ingestMode: 'fallback_runtime',
      adapterStatus: result.ok ? result.status : 'failed',
      adapterError: result.ok ? null : result.errorCode,
      snapshotHash: persisted.ok && typeof persisted.data?.snapshot_hash === 'string' ? persisted.data.snapshot_hash : 'unpersisted',
      persisted: persisted.ok,
    },
  }, warnings);
}
