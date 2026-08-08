import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readRootSovereignState } from '@/lib/root/sovereign/rootSovereignAdapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.console.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({
    ok: true,
    state: await readRootSovereignState(),
    accessMode: gate.ctx.isRoot ? 'sovereign' : 'observer',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
