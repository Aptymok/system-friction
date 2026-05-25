import { NextResponse } from 'next/server';
import type { ApiResult, SourceHealthDTO } from '../../../../../packages/api-contracts/src';

function apiOk<TData>(data: TData, traceId?: string, warnings?: string[]) {
  const result: ApiResult<TData> = { ok: true, data, traceId, warnings };
  return NextResponse.json(result);
}

export async function GET() {
  const now = new Date().toISOString();
  const sourceHealth: SourceHealthDTO = {
    sourceId: 'sfi-api-runtime',
    status: 'healthy',
    kind: 'manual',
    lastObservedAt: now,
    checkedAt: now,
    confidence: 1,
    message: 'api runtime reachable; internal minimal health only; no external source or DB check performed',
  };

  return apiOk({
    reachable: true,
    timestamp: now,
    ingestEndpointReachable: true,
    sourceState: 'observed',
    evidenceLevel: 'direct',
    confidence: 1,
    sourceHealth,
  }, `source-health:${now}`);
}
