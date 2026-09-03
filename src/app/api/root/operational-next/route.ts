import { NextResponse } from 'next/server';
import { readRootOperationalNext } from '@/lib/root/operationalNext';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.operational_next.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const operationalNext = await readRootOperationalNext();
    return NextResponse.json(
      { ok: true, operationalNext },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'SFI_OPERATIONAL_NEXT_UNAVAILABLE',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503, headers: { 'Retry-After': '3', 'Cache-Control': 'no-store' } });
  }
}
