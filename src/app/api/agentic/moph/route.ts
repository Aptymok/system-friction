import { NextResponse } from 'next/server';
import { runMophAgent } from '@/lib/agents/sfiAgents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const stuckSystem = typeof payload.stuckSystem === 'string' ? payload.stuckSystem.trim() : '';
  if (stuckSystem.length < 12) {
    return NextResponse.json({ ok: false, error: 'stuck_system_required' }, { status: 400 });
  }

  const result = await runMophAgent({
    stuckSystem,
    objective: typeof payload.objective === 'string' ? payload.objective : undefined,
    attempts: typeof payload.attempts === 'string' ? payload.attempts : undefined,
    evidence: typeof payload.evidence === 'string' ? payload.evidence : undefined,
    consequence: typeof payload.consequence === 'string' ? payload.consequence : undefined,
    accountId: typeof payload.accountId === 'string' ? payload.accountId : null,
  });

  return NextResponse.json(result);
}
