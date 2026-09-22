import { NextRequest, NextResponse } from 'next/server';
import { denseFragment, ensureOwnedNode } from '@/lib/server/productionBackend';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mode = ['compact', 'operational', 'public_fragment'].includes(body.mode) ? body.mode : 'compact';
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;
  if (!ctx.node || !ctx.user) return NextResponse.json({ error: 'node_not_ready' }, { status: 404 });

  const { data: events, error: eventsError } = await ctx.service
    .from('epistemic_events')
    .select('id,event_name,payload,created_at')
    .eq('actor_id', ctx.user.id)
    .eq('node_id', ctx.node.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (eventsError) return NextResponse.json({ error: 'bitacora_source_read_failed' }, { status: 500 });

  let observedMetrics: Record<string, unknown> | null = null;
  for (const event of events || []) {
    const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? event.payload as Record<string, unknown>
      : {};
    if (payload.metrics && typeof payload.metrics === 'object' && !Array.isArray(payload.metrics)) {
      observedMetrics = payload.metrics as Record<string, unknown>;
      break;
    }
  }
  const metrics = observedMetrics || {
    ihg: ctx.node.current_ihg,
    nti: ctx.node.current_nti,
    ldi: ctx.node.current_ldi,
  };
  const fragment = denseFragment(metrics as { ihg?: number; nti?: number; ldi?: number }, mode === 'public_fragment' ? 'publicar residuo mínimo antes de saturación' : undefined);
  const density = Math.min(1, Number(((events?.length || 0) / 20).toFixed(2)));
  const calendar_hint = Number(metrics.ldi ?? 0) > 1 ? 'ventana corta: próximas 24-48h' : 'ventana estable: próximas 72h';
  const suggested_publication = mode === 'public_fragment' ? fragment : null;

  const event = await emitEpistemicEvent({
    eventName: 'bitacora_regenerated',
    logbookId: `ACTOR:${ctx.user.id}`,
    epistemicClass: 'derived',
    schemaVersion: '2026-09-21.actor-event.v1',
    sourceId: body.source_event_id ? String(body.source_event_id) : `ACTOR:${ctx.user.id}`,
    sourceType: 'api/bitacora/regenerate',
    actorId: ctx.user.id,
    nodeId: ctx.node.id,
    confidence: 0.55,
    payload: {
      mode,
      source_event_id: body.source_event_id || null,
      fragment,
      density,
      calendar_hint,
      streamType: 'bitacora',
    },
  });

  if (!event.ok) return NextResponse.json({ error: 'bitacora_persist_failed' }, { status: 500 });

  const warnings: string[] = [];
  if (mode === 'public_fragment') {
    const draft = await emitEpistemicEvent({
      eventName: 'SFI_MEDIA_DRAFT_RECORDED',
      logbookId: `ACTOR:${ctx.user.id}`,
      epistemicClass: 'derived',
      schemaVersion: '2026-09-21.actor-event.v1',
      sourceId: event.event.id,
      sourceType: 'api/bitacora/regenerate',
      actorId: ctx.user.id,
      nodeId: ctx.node.id,
      confidence: 0.55,
      payload: {
        node_id: ctx.node.id,
        source_type: 'bitacora',
        source_id: event.event.id,
        platform_target: 'field',
        content: fragment,
        status: 'pending_human_validation',
        metadata: { density, calendar_hint },
        streamType: 'media_draft',
      },
    });
    if (!draft.ok) warnings.push('media_draft_not_persisted');
  }

  return NextResponse.json({
    status: 'ok',
    fragment,
    density,
    suggested_publication,
    calendar_hint,
    warnings: warnings.length ? warnings : undefined,
  });
}
