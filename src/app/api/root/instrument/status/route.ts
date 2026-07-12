import { NextResponse } from 'next/server';

import { readAmvInstrumentStatus } from '@/lib/amv/instrumentStatus';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.instrument.status');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    const status = await readAmvInstrumentStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'instrument_status_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
