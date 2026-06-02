import { NextRequest, NextResponse } from 'next/server';
import { evaluateScoreFrictionObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const audioMetadata = body.audioMetadata && typeof body.audioMetadata === 'object' ? body.audioMetadata : {};
  const result = await evaluateScoreFrictionObservation({
    raw_payload: {
      title: body.title ?? null,
      artist: body.artist ?? null,
      audioMetadata,
      comments: body.comments ?? [],
      lyrics: body.lyrics ?? null,
    },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
