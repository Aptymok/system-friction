import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

function finite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const horizon = Math.max(1, Math.min(45, Number(body.horizon_days || 7)));
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error || !ctx.node || !ctx.user) return ctx.error ?? NextResponse.json({ error: 'node_not_ready' }, { status: 404 });

  const [interventions, events] = await Promise.all([
    ctx.service
      .from('field_interventions')
      .select('id,minimum_change,status,created_at')
      .eq('owner_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    ctx.service
      .from('epistemic_events')
      .select('id,event_name,payload,created_at')
      .eq('actor_id', ctx.user.id)
      .eq('node_id', ctx.node.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (interventions.error || events.error) {
    return NextResponse.json({ error: 'phenomenological_calendar_context_unavailable' }, { status: 500 });
  }

  const ldi = finite(ctx.node.current_ldi);
  const ihg = finite(ctx.node.current_ihg);
  const nti = finite(ctx.node.current_nti);
  const measured = ldi !== null || ihg !== null || nti !== null;
  const pressure = !measured
    ? 'indeterminada'
    : (ldi !== null && ldi > 1) || (ihg !== null && ihg < 0.35)
      ? 'alta'
      : nti !== null && nti > 0.55
        ? 'baja'
        : 'media';

  const recentIntervention = interventions.data?.[0]?.minimum_change;
  const recentTrace = Boolean(events.data?.length);
  const now = Date.now();
  const windows = Array.from({ length: Math.min(3, horizon) }, (_, index) => {
    const offset = index + 1;
    const starts = new Date(now + offset * 24 * 60 * 60 * 1000 + (pressure === 'alta' ? 7 : 10) * 60 * 60 * 1000);
    const ends = new Date(starts.getTime() + (pressure === 'alta' ? 2 : 4) * 60 * 60 * 1000);
    return {
      label: pressure === 'baja'
        ? 'ventana de baja fricción'
        : pressure === 'alta'
          ? 'ventana de contención'
          : 'ventana de observación',
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      execution_bias: pressure === 'alta' ? 'acción mínima verificable' : 'registro longitudinal',
      risk: pressure,
      epistemic_state: measured ? 'observed' : 'missing',
      recommended_action: recentIntervention || (recentTrace ? 'condensar residuo reciente' : 'capturar primera traza del día'),
    };
  });

  return NextResponse.json({ windows });
}
