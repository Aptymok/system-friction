import { NextResponse } from 'next/server';
import { getLatestGlobalWorldSpectSnapshot, nextWorldSpectMeasurementWindow } from '@/observatory/worldspect/globalWorldSpect';

export async function GET() {
  const latest = await getLatestGlobalWorldSpectSnapshot();
  return NextResponse.json({
    ok: latest.ok,
    mode: 'readiness_check',
    message: latest.snapshot
      ? 'WorldSpect global snapshot disponible.'
      : 'WorldSpect global sin medicion vigente.',
    snapshot: latest.snapshot,
    nextMeasurementAt: nextWorldSpectMeasurementWindow(),
    writesPerformed: false,
  });
}
