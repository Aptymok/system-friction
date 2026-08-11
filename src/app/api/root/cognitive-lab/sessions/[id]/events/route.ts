import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  appendCognitiveLabEvent,
  getCognitiveLabSession,
  type CognitiveLabEventKind,
  type CognitiveLabProvenance,
} from '@/lib/cognitive-lab/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

const EVENT_KINDS = new Set<CognitiveLabEventKind>([
  'PROMPT',
  'MODEL_OUTPUT',
  'FOUNDER_DECISION',
  'TOOL_EXECUTION',
  'ARTIFACT',
  'OUTCOME',
  'OBSERVATION',
  'FRICTION',
  'OMISSION',
  'OTHER',
]);

const PROVENANCE = new Set<CognitiveLabProvenance>([
  'FOUNDER_ORIGINATED',
  'MODEL_PROPOSED',
  'CO_DEVELOPED',
  'SYSTEM_EMERGENT',
  'EXTERNAL',
  'FOUNDER_AUTHORIZATION',
  'UNKNOWN',
]);

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, maximum = 12000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 100)
    : [];
}

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.events.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const lab = await getCognitiveLabSession(decodeURIComponent(id));
    return NextResponse.json({ ok: true, events: lab.events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: 'COGNITIVE_LAB_EVENTS_READ_FAILED', details }, { status: details.includes('NOT_FOUND') ? 404 : 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.events.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const sessionId = decodeURIComponent(id);
    const body = record(await request.json().catch(() => null));
    const eventKind = text(body.eventKind, 80) as CognitiveLabEventKind;
    const provenance = text(body.provenance, 80) as CognitiveLabProvenance;
    const actorKey = text(body.actorKey, 160);

    if (!EVENT_KINDS.has(eventKind)) return NextResponse.json({ ok: false, error: 'eventKind_invalid' }, { status: 400 });
    if (!PROVENANCE.has(provenance)) return NextResponse.json({ ok: false, error: 'provenance_invalid' }, { status: 400 });
    if (!actorKey) return NextResponse.json({ ok: false, error: 'actorKey_required' }, { status: 400 });

    const event = await appendCognitiveLabEvent(gate.ctx.user.id, sessionId, {
      eventKind,
      provenance,
      actorKey,
      relationFrom: text(body.relationFrom, 160) || null,
      relationTo: text(body.relationTo, 160) || null,
      payload: record(body.payload),
      evidenceRefs: strings(body.evidenceRefs),
      sourceRef: text(body.sourceRef, 1000) || null,
      occurredAt: text(body.occurredAt, 80) || null,
    });

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'cognitive_lab.event.recorded',
      target: String(event.id),
      payload: {
        sessionId,
        eventKind: event.event_kind,
        provenance: event.provenance,
        actorKey: event.actor_key,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('NOT_FOUND') ? 404 : details.includes('NOT_OPEN') ? 409 : 500;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_LAB_EVENT_CREATE_FAILED', details }, { status });
  }
}
