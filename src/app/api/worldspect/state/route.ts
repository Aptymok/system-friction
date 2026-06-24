import { NextResponse } from 'next/server';
import {
  buildCanonicalWorldSpectState,
  refreshCanonicalWorldSpectState,
} from '@/lib/worldspect/canonicalState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await buildCanonicalWorldSpectState());
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'worldspect_canonical_state',
      error: error instanceof Error ? error.message : 'worldspect_state_failed',
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    return NextResponse.json(await refreshCanonicalWorldSpectState());
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'worldspect_canonical_refresh',
      error: error instanceof Error ? error.message : 'worldspect_refresh_failed',
    }, { status: 500 });
  }
}
