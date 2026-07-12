import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.governance.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const state = await readRootSovereignState();
  return NextResponse.json({ ok: true, state }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
  });
}
