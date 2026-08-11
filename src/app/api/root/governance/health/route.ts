import { NextResponse } from 'next/server';
import { readGovernanceHealth } from '@/lib/governance/readGovernanceHealth';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('governance.health.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const health = await readGovernanceHealth();
  return NextResponse.json({ ok: true, health }, { headers: { 'Cache-Control': 'no-store' } });
}
