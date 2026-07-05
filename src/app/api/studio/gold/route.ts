import { NextResponse } from 'next/server';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readStudioGoldState();
  return NextResponse.json({ ok: true, state });
}
