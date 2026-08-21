import { NextResponse } from 'next/server';
import { appendEpistemicEvent, streamEpistemicEvents } from '@/lib/events/eventStore';
import { isEpistemicClass } from '../../../../../packages/events/src/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const events = await streamEpistemicEvents('SFI', 200);
  return NextResponse.json({
    ok: events.ok,
    source: 'epistemic_events',
    eventCount: events.data?.length ?? 0,
    events: events.data ?? [],
    ...(events.ok ? {} : { error: 'sfi_event_stream_failed' }),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'event_object_required' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const eventName = typeof input.eventName === 'string' ? input.eventName.trim() : '';
  const epistemicClass = input.epistemicClass;
  const confidence = Number(input.confidence);
  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source)
    ? input.source as Record<string, unknown>
    : null;
  const sourceId = typeof source?.sourceId === 'string' ? source.sourceId.trim() : '';
  const sourceType = typeof source?.sourceType === 'string' ? source.sourceType.trim() : '';

  if (!eventName || !isEpistemicClass(epistemicClass) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || !sourceId || !sourceType) {
    return NextResponse.json({ ok: false, error: 'eventName_epistemicClass_confidence_and_source_required' }, { status: 400 });
  }

  const event = await appendEpistemicEvent({
    eventName,
    epistemicClass: epistemicClass as any,
    confidence,
    payload: 'payload' in input ? input.payload : {},
    occurredAt: typeof input.occurredAt === 'string' ? input.occurredAt : new Date().toISOString(),
    source: { sourceId, sourceType },
    lineage: Array.isArray(input.lineage) ? input.lineage.filter((item): item is string => typeof item === 'string') : [],
    uncertainty: typeof input.uncertainty === 'string' ? input.uncertainty : undefined,
    logbookId: 'SFI',
  });

  return NextResponse.json(event, { status: event.ok ? 201 : 400 });
}
