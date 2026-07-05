import { NextResponse } from 'next/server';
import { readObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldAdapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readObservatoryGoldState();
  return NextResponse.json({ ok: true, state });
}
