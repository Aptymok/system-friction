import { NextRequest, NextResponse } from 'next/server';
import { observeSoundCloudTrack } from '@/lib/scorefriction/connectors/soundcloud';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await observeSoundCloudTrack({
    case_id: typeof body.case_id === 'string' ? body.case_id : undefined,
    trackId: typeof body.trackId === 'string' || typeof body.trackId === 'number' ? body.trackId : undefined,
    source_url: typeof body.source_url === 'string' ? body.source_url : undefined,
    territory: typeof body.territory === 'string' ? body.territory : 'MX',
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
