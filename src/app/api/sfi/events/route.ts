import { NextRequest, NextResponse } from 'next/server';
import { appendOperationalEvent, getOperationalEvents } from '@/lib/operational/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: 'in_memory_event_log_p02',
    warning: 'P02 stores events in memory for local circulation testing. P03 should persist them.',
    events: getOperationalEvents(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const event = appendOperationalEvent(body);
  return NextResponse.json({ ok: true, status: 'event_registered_in_memory', event });
}
