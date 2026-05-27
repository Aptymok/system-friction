import { NextRequest, NextResponse } from 'next/server';
import { buildWorldSpectResponse } from '@/lib/worldspect/contract';
import { runWorldSpectrum } from '@/lib/worldspect/runWorldSpectrum';
import { upsertWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const secret = process.env.WORLDSPECT_INGEST_SECRET;
  return Boolean(secret && authHeader && authHeader.split(' ')[1] === secret);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runWorldSpectrum();
  const response = buildWorldSpectResponse(result.payload);

  if (response.sourceState === 'missing') {
    return NextResponse.json({ ok: true, data: response, warnings: ['worldspect_diagnostic_missing'] });
  }

  const persisted = await upsertWorldSpectSnapshot({
    sourceState: response.sourceState,
    evidenceLevel: 'direct',
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
    ingestMode: 'diagnostic',
  });

  return NextResponse.json({
    ok: persisted.ok,
    data: response,
    warnings: result.ok ? [] : [result.errorCode],
    persistence: persisted,
  }, { status: persisted.ok ? 200 : 502 });
}
