import { NextResponse } from 'next/server';
import { buildAgenticRootState } from '@/lib/agents/sfiAgents';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('agentic-state.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const state = await buildAgenticRootState();
  return NextResponse.json(state, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
