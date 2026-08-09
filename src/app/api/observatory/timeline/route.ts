import { NextResponse } from 'next/server';
import { readPublicWorldSnapshotTimeline } from '@/lib/observatory/public/worldSnapshotTimeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET() {
  try {
    const state = await readPublicWorldSnapshotTimeline();
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'PUBLIC_OBSERVATORY_TIMELINE_FAILED',
      details: error instanceof Error ? error.message : String(error),
      frames: [],
    }, { status: 503 });
  }
}