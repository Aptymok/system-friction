import { NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { runRootSelfObservability } from '@/lib/root/selfObservability';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootActor('self-observability.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json(await runRootSelfObservability());
}

export async function POST(request: Request) {
  const gate = await requireRootActor('self-observability.record');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const result = await runRootSelfObservability();
  await appendLogbookEntry({
    scope: 'self_observability',
    visibility: 'system',
    event_type: 'self_observability_check',
    title: 'ROOT self observability',
    summary: result.ok ? 'Sistema sin faltantes detectados.' : `Sistema ${result.system_health}: ${result.missing_parts.length} piezas faltantes.`,
    payload: result,
  });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'self-observability.record', target: 'logbook', payload: { ok: result.ok }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ok: true, data: result, audit });
}
