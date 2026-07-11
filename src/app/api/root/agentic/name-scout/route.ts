import { NextResponse } from 'next/server';
import { runProspectScout } from '@/lib/agents/prospectScout';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.name_scout');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const seeds = Array.isArray(body.seeds) ? body.seeds.filter((item): item is string => typeof item === 'string') : undefined;

  const result = runProspectScout({
    vector: typeof body.vector === 'string' ? body.vector : undefined,
    seeds,
    limit: typeof body.limit === 'number' ? body.limit : undefined,
  });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'agentic.name_scout', target: 'prospect_scout', payload: { resultCount: result.candidates.length }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, audit });
}
