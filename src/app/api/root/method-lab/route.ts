import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.method-lab.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    return NextResponse.json({ ok: true, lab: await readMethodLabState() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'method_lab_state_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
