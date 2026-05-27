import { NextResponse } from 'next/server';
import { readTwinSelfObservation } from '@/lib/operational/twinState';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readTwinSelfObservation();
  return NextResponse.json({ ok: true, data: state });
}
