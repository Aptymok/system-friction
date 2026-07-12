import { NextResponse } from 'next/server';
import { runClientFinderAgent } from '@/lib/agents/sfiAgents';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.client_finder');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await runClientFinderAgent({
    entityName: typeof body.entityName === 'string' ? body.entityName : undefined,
    personOrRole: typeof body.personOrRole === 'string' ? body.personOrRole : undefined,
    sector: typeof body.sector === 'string' ? body.sector : undefined,
    publicSignal: typeof body.publicSignal === 'string' ? body.publicSignal : undefined,
    source: typeof body.source === 'string' ? body.source : undefined,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
  });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'agentic.client_finder', target: 'client_finder', payload: { ok: result.ok }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, audit });
}
