import { NextRequest, NextResponse } from 'next/server';
import type { ApiResult, SourceHealthDTO } from '@sfi/api-contracts';
import { runWorldSpectrum, type WorldSpectrumCliPayload, type WorldSpectrumSource } from '@/lib/worldspect/runWorldSpectrum';
import { upsertWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';

export const runtime = 'nodejs';

type WorldSpectRealSourceState = 'observed' | 'degraded';

function apiOk<TData>(data: TData, warnings?: string[]) {
  const result: ApiResult<TData> = { ok: true, data, warnings };
  return NextResponse.json(result);
}

function apiError(error: string, status = 400) {
  const result: ApiResult = { ok: false, error };
  return NextResponse.json(result, { status });
}

function isAuthorized(req: NextRequest) {
  const expected = process.env.WORLDSPECT_INGEST_SECRET;
  if (!expected) return false;

  const header = req.headers.get('x-sfi-cron-secret');
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  return header === expected || bearer === expected;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function isRealSource(source: WorldSpectrumSource) {
  return source.value !== null && source.simulated !== true && !source.error;
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
    message: source.error ? 'source_unavailable' : undefined,
  }));
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return apiError('unauthorized_worldspect_ingest', 401);
  }

  const result = await runWorldSpectrum();
  const sourceState: WorldSpectRealSourceState = result.status === 'observed' ? 'observed' : 'degraded';
  const payload = result.payload;
  const confidence = calculateConfidence(payload);
  const sourceHealth = toSourceHealth(payload);
  const hasMeasuredMetrics = typeof payload.wsi === 'number' && typeof payload.nti === 'number';

  const fieldStateSignal = hasMeasuredMetrics
    ? {
      sourceState,
      evidenceLevel: 'direct' as const,
      confidence,
      metrics: {
        wsi: payload.wsi as number,
        nti: payload.nti as number,
      },
      observedAt: payload.ts,
      sourceIds: payload.sources.filter(isRealSource).map((source) => source.key),
    }
    : null;

  const persisted = await upsertWorldSpectSnapshot({
    sourceState,
    evidenceLevel: 'direct',
    confidence,
    wsi: payload.wsi,
    nti: payload.nti,
    ts: payload.ts,
    sources: payload.sources,
    degraded_sources: payload.degraded_sources,
    sourceHealth,
    fieldStateSignal,
    rawPayload: payload,
    adapterStatus: result.ok ? result.status : 'failed',
    adapterError: result.ok ? null : result.errorCode,
    ingestMode: 'daily_cron',
  });

  if (!persisted.ok) {
    return apiError(persisted.error, 500);
  }

  return apiOk({
    ingested: true,
    sourceState,
    confidence,
    wsi: payload.wsi,
    nti: payload.nti,
    degraded_sources: payload.degraded_sources,
    sourceHealth,
    snapshot: persisted.data,
  }, result.ok ? undefined : [result.errorCode]);
}

export async function GET() {
  return apiError('method_not_allowed_use_post', 405);
}
