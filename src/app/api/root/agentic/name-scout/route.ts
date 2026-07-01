import { NextResponse } from 'next/server';
import { runProspectScout } from '@/lib/agents/prospectScout';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.name_scout');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const seeds = Array.isArray(body.seeds) ? body.seeds.filter((item): item is string => typeof item === 'string') : undefined;

  return NextResponse.json(runProspectScout({
    vector: typeof body.vector === 'string' ? body.vector : undefined,
    seeds,
    limit: typeof body.limit === 'number' ? body.limit : undefined,
  }));
}
