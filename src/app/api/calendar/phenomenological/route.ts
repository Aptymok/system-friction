import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const horizon = Math.max(1, Math.min(45, Number(body.horizon_days || 7)));
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;

  const [actions, audits, interactions, events] = await Promise.all([
    ctx.service.from('actions').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(20),
    ctx.service.from('audits').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(10),
    ctx.service.from('interaction_events').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(20),
    ctx.service.from('cognitive_event_stream').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(20),
  ]);

  const latestAudit = audits.data?.[0];
  const ldi = Number(latestAudit?.ldi ?? ctx.node.current_ldi ?? 0.5);
  const ihg = Number(latestAudit?.ihg ?? ctx.node.current_ihg ?? 0.5);
  const nti = Number(latestAudit?.nti ?? ctx.node.current_nti ?? 0.5);
  const now = Date.now();
  const pressure = ldi > 1 || ihg < 0.35 ? 'alta' : nti > 0.55 ? 'baja' : 'media';
  const windows = Array.from({ length: Math.min(3, horizon) }, (_, index) => {
    const offset = index + 1;
    const starts = new Date(now + offset * 24 * 60 * 60 * 1000 + (pressure === 'alta' ? 7 : 10) * 60 * 60 * 1000);
    const ends = new Date(starts.getTime() + (pressure === 'alta' ? 2 : 4) * 60 * 60 * 1000);
    return {
      label: pressure === 'baja' ? 'ventana de baja fricción' : pressure === 'alta' ? 'ventana de contención' : 'ventana de observación',
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      execution_bias: pressure === 'alta' ? 'acción mínima verificable' : 'registro longitudinal',
      risk: pressure,
      recommended_action: actions.data?.[0]?.description || (events.data?.length || interactions.data?.length ? 'condensar residuo reciente' : 'capturar primera traza del día'),
    };
  });

  return NextResponse.json({ windows });
}
