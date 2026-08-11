import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.agents.health');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const data = await readAgentPassports();
  return NextResponse.json({
    ok: true,
    generatedAt: data.generatedAt,
    runtimeStatus: data.runtimeStatus,
    counts: data.counts,
    degraded: data.passports.filter((item) => item.lifecycle === 'DEGRADED').map((item) => ({ id: item.id, namespace: item.namespace, missing: item.missingTables, warnings: item.warnings })),
    missing: data.passports.filter((item) => item.lifecycle === 'MISSING').map((item) => ({ id: item.id, namespace: item.namespace, missing: item.missingTables, warnings: item.warnings })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
