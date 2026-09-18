import { NextResponse } from 'next/server';
import { readPublicWorldSnapshotTimeline } from '@/lib/observatory/public/worldSnapshotTimeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_CDN_CACHE = { 'Vercel-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } as const;

export async function GET() {
  try {
    const state = await readPublicWorldSnapshotTimeline();
    return NextResponse.json({ ok: true, ...state }, { headers: PUBLIC_CDN_CACHE });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'PUBLIC_OBSERVATORY_TIMELINE_FAILED',
      details: error instanceof Error ? error.message : String(error),
      frames: [],
    }, { status: 503 });
  }
}