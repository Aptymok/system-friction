import { NextResponse } from 'next/server';
import { getRootTelemetryCore } from '@/lib/root/telemetry/agentRegistry';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('telemetry-core.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const core = await getRootTelemetryCore();
  return NextResponse.json(
    { ok: true, ...core },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } },
  );
}
