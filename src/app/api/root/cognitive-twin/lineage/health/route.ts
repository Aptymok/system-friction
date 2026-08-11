import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readCognitiveTwinLineageHealth } from '@/lib/cognitive-twin/reentry/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.cognitive-twin.lineage.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    return NextResponse.json({ ok: true, lineage: await readCognitiveTwinLineageHealth() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_lineage_health_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
