import { NextRequest, NextResponse } from 'next/server';
import { denseFragment, ensureOwnedNode } from '@/lib/server/productionBackend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mode = ['compact', 'operational', 'public_fragment'].includes(body.mode) ? body.mode : 'compact';
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;

  const { data: events } = await ctx.service
    .from('cognitive_event_stream')
    .select('*')
    .eq('node_id', ctx.node.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const metrics = events?.find((event) => event.payload?.metrics)?.payload?.metrics || {
    ihg: ctx.node.current_ihg,
    nti: ctx.node.current_nti,
    ldi: ctx.node.current_ldi,
  };
  const fragment = denseFragment(metrics, mode === 'public_fragment' ? 'publicar residuo mínimo antes de saturación' : undefined);
  const density = Math.min(1, Number(((events?.length || 0) / 20).toFixed(2)));
  const calendar_hint = Number(metrics.ldi ?? 0) > 1 ? 'ventana corta: próximas 24-48h' : 'ventana estable: próximas 72h';
  const suggested_publication = mode === 'public_fragment' ? fragment : null;

  const { data: event } = await ctx.service.from('cognitive_event_stream').insert({
    node_id: ctx.node.id,
    stream_type: 'bitacora',
    event_name: 'bitacora_regenerated',
    payload: { mode, source_event_id: body.source_event_id || null, fragment, density, calendar_hint },
    emitted_by: 'api/bitacora/regenerate',
  }).select('id').single();

  if (mode === 'public_fragment') {
    await ctx.service.from('media_drafts').insert({
      node_id: ctx.node.id,
      source_type: 'bitacora',
      source_id: event?.id || null,
      platform_target: 'field',
      content: fragment,
      status: 'pending_human_validation',
      metadata: { density, calendar_hint },
    });
  }

  return NextResponse.json({ status: 'ok', fragment, density, suggested_publication, calendar_hint });
}
