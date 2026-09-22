import { NextRequest, NextResponse } from 'next/server';
import { denseFragment, ensureOwnedNode } from '@/lib/server/productionBackend';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mode = ['compact', 'operational', 'public_fragment'].includes(body.mode) ? body.mode : 'compact';
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error || !ctx.node || !ctx.user) return ctx.error ?? NextResponse.json({ error: 'node_not_ready' }, { status: 404 });

  const { data: events, error: readError } = await ctx.service
    .from('epistemic_events')
    .select('id,event_name,payload,created_at')
    .eq('actor_id', ctx.user.id)
    .eq('node_id', ctx.node.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (readError) return NextResponse.json({ error: 'bitacora_event_read_failed' }, { status: 500 });

  const rows = Array.isArray(events) ? events : [];
  const metricsEvent = rows.find((event) => isRecord(event.payload) && isRecord(event.payload.metrics));
  const metrics = metricsEvent && isRecord(metricsEvent.payload) && isRecord(metricsEvent.payload.metrics)
    ? metricsEvent.payload.metrics
    : {
        ihg: ctx.node.current_ihg,
        nti: ctx.node.current_nti,
        ldi: ctx.node.current_ldi,
      };

  const fragment = denseFragment(metrics, mode === 'public_fragment' ? 'publicar residuo mínimo antes de saturación' : undefined);
  const density = Math.min(1, Number((rows.length / 20).toFixed(2)));
  const ldi = typeof metrics.ldi === 'number' ? metrics.ldi : null;
  const calendar_hint = ldi === null
    ? 'ventana indeterminada: falta LDI observado'
    : ldi > 1
      ? 'ventana corta: próximas 24-48h'
      : 'ventana estable: próximas 72h';
  const suggested_publication = mode === 'public_fragment' ? fragment : null;

  const emitted = await emitEpistemicEvent({
    eventName: 'bitacora_regenerated',
    logbookId: `ACTOR:${ctx.user.id}`,
    epistemicClass: 'derived',
    schemaVersion: '2026-09-21.actor-event.v1',
    sourceId: String(body.source_event_id || 'bitacora'),
    sourceType: 'api/bitacora/regenerate',
    actorId: ctx.user.id,
    nodeId: ctx.node.id,
    confidence: metricsEvent ? 0.65 : 0.35,
    payload: {
      streamType: 'bitacora',
      mode,
      source_event_id: body.source_event_id || null,
      fragment,
      density,
      calendar_hint,
    },
  });

  if (!emitted.ok) return NextResponse.json({ error: 'bitacora_persist_failed' }, { status: 500 });

  if (mode === 'public_fragment') {
    const { error } = await ctx.service.from('media_drafts').insert({
      node_id: ctx.node.id,
      source_type: 'bitacora',
      source_id: emitted.event.id,
      platform_target: 'field',
      content: fragment,
      status: 'pending_human_validation',
      metadata: { density, calendar_hint },
    });
    if (error) return NextResponse.json({ error: 'bitacora_draft_persist_failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok', fragment, density, suggested_publication, calendar_hint });
}
