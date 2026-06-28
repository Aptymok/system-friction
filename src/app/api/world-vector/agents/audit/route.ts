import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { runAlertAgent, runPersistenceAuditAgent } from '@/lib/world-vector/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireWorldVectorAgentActor('audit');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const [persistence, alerts] = await Promise.all([
    runPersistenceAuditAgent(),
    runAlertAgent(),
  ]);

  return NextResponse.json({
    ok: true,
    agent: 'audit',
    persistence,
    alerts,
  });
}
