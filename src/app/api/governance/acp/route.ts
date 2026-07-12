import { NextResponse } from 'next/server';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootActor('governance.acp.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, data: await readGovernanceRuntime() });
}
