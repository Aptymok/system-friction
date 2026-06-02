import { NextRequest, NextResponse } from 'next/server';
import { recordScoreFrictionObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await recordScoreFrictionObservation({
    case_id: body.case_id,
    source_name: body.source_name ?? 'manual_upload',
    source_url: body.source_url,
    territory: body.territory ?? 'MX',
    raw_payload: body.raw_payload ?? {},
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
