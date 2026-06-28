import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { runDailyObservationAgent } from '@/lib/world-vector/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await requireWorldVectorAgentActor('daily');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const url = new URL(request.url);
  const persist = url.searchParams.get('persist') !== 'false';
  const result = await runDailyObservationAgent({ persist });
  return NextResponse.json(result);
}
