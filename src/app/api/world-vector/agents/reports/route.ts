import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { runInternalReportAgent, runPublicReportAgent } from '@/lib/world-vector/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await requireWorldVectorAgentActor('reports');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const url = new URL(request.url);
  const persist = url.searchParams.get('persist') !== 'false';
  const [internal, publicReport] = await Promise.all([
    runInternalReportAgent({ persist }),
    runPublicReportAgent({ persist }),
  ]);

  return NextResponse.json({
    ok: true,
    agent: 'reports',
    mode: persist ? 'persist_if_ready' : 'read_only',
    internal,
    public: publicReport,
  });
}
