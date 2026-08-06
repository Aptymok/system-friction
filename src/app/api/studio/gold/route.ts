import { NextResponse } from 'next/server';
import { requireFounder } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireFounder();
    const state = await readStudioGoldState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
