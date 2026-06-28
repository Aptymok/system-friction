import { NextResponse } from 'next/server';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';
import { persistWorldVectorObservation } from '@/lib/world-vector/persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const data = await getWorldVectorToday();
  const url = new URL(request.url);
  const shouldPersist = url.searchParams.get('persist') === 'true';
  const persistence = shouldPersist
    ? await persistWorldVectorObservation({
      observation: data.observation,
      cycleRange: data.cycle_range,
    })
    : data.persistence;

  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    data: {
      ...data,
      persistence,
    },
  });
}
