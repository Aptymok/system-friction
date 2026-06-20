import { NextResponse } from 'next/server';
import {
  appendSfiOperationalEventAsync,
  getSfiOperationalPersistenceStatus,
  readSfiOperationalEventsAsync,
} from '@/lib/sfi/operational/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [events, storage] = await Promise.all([
    readSfiOperationalEventsAsync(),
    getSfiOperationalPersistenceStatus(),
  ]);

  return NextResponse.json({
    ok: true,
    decision: 'IMPLEMENTAR',
    source: 'src/lib/sfi/operational/events',
    eventCount: events.length,
    events,
    storage,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const event = await appendSfiOperationalEventAsync(
    body && typeof body === 'object' && !Array.isArray(body) ? body : {},
  );

  return NextResponse.json({
    ok: true,
    decision: 'IMPLEMENTAR',
    event,
  });
}
