import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { readCognitiveTwinConnectionStatus } from '@/core/cognitive-twin/reentry/connectionStatus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.cognitive-twin.connection.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    const connection = await readCognitiveTwinConnectionStatus();
    return NextResponse.json({ ok: true, connection }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'cognitive_twin_connection_read_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
