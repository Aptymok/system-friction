import { NextResponse } from 'next/server';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readStudioProductionState();
  return NextResponse.json({ ok: true, state });
}
