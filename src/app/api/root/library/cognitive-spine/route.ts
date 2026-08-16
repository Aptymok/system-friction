import { NextResponse } from 'next/server';
import { inspectLibraryCognitiveSpineImpact } from '@/lib/sfi/library/cognitiveSpineImpactContext';
import { requireRootViewer } from '@/lib/root/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootViewer('root.library.cognitive-spine.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const inspection = await inspectLibraryCognitiveSpineImpact();
  return NextResponse.json({
    ok: true,
    inspection,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
