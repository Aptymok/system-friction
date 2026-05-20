import { NextResponse } from 'next/server';
import { getLatestGlobalWorldSpectSnapshot, nextWorldSpectMeasurementWindow } from '@/observatory/worldspect/globalWorldSpect';

export async function GET() {
  const result = await getLatestGlobalWorldSpectSnapshot();
  return NextResponse.json({
    ok: result.ok,
    snapshot: result.snapshot,
    state: result.snapshot ? 'measured' : 'missing',
    nextMeasurementAt: nextWorldSpectMeasurementWindow(),
    error: result.error,
  });
}
