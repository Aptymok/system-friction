import { NextResponse } from 'next/server';

import { readPublicAmvInstrumentStatus } from '@/lib/amv/instrumentStatus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await readPublicAmvInstrumentStatus();
    return NextResponse.json({ ok: true, status }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'public_instrument_status_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
