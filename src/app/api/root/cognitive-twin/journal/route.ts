import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readCognitiveTwinJournal } from '@/lib/cognitive-twin/reentry/journal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.cognitive-twin.journal.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    return NextResponse.json({ ok: true, journal: await readCognitiveTwinJournal() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_journal_read_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
