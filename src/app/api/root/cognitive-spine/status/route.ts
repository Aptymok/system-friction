import { NextResponse } from 'next/server';
import { readRootCognitiveSpineStatus } from '@/lib/root/cognitiveSpineStatus';
import { requireRootViewer } from '@/lib/root/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootViewer('root.cognitive-spine.status');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const status = await readRootCognitiveSpineStatus();
  return NextResponse.json({ ok: true, status }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
