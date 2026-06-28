import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { runCycleCloseAgent } from '@/lib/world-vector/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await requireWorldVectorAgentActor('close_cycle');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';
  const result = await runCycleCloseAgent({ force });
  const status = result.blocked.includes('cycle_close_not_allowed_before_sunday') ? 409 : 200;
  return NextResponse.json(result, { status });
}
