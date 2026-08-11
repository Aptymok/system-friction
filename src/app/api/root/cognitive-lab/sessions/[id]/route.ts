import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { getCognitiveLabSession } from '@/lib/cognitive-lab/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.sessions.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const sessionId = decodeURIComponent(id);
    const lab = await getCognitiveLabSession(sessionId);
    return NextResponse.json({ ok: true, ...lab }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: 'COGNITIVE_LAB_SESSION_READ_FAILED',
      details,
    }, { status: details.includes('NOT_FOUND') ? 404 : 500 });
  }
}
