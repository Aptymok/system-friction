import { NextResponse } from 'next/server';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';
import { buildWorldVectorPublicReport } from '@/lib/world-vector/reportBuilder';
import { getWorldVectorPersistenceStatus, persistWorldVectorReport } from '@/lib/world-vector/persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldPersist = url.searchParams.get('persist') === 'true';
  const today = await getWorldVectorToday();
  const report = buildWorldVectorPublicReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const persistence = shouldPersist
    ? await persistWorldVectorReport({
      report,
      cycleRange: today.cycle_range,
      observation: today.observation,
    })
    : await getWorldVectorPersistenceStatus();

  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    report,
    persistence,
  });
}
