import { NextRequest, NextResponse } from 'next/server';
import { createScoreFrictionAttractorSnapshot } from '@/lib/scorefriction/longitudinal';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await createScoreFrictionAttractorSnapshot({
    proto_attractor_id: typeof body.proto_attractor_id === 'string' ? body.proto_attractor_id : undefined,
    case_id: typeof body.case_id === 'string' ? body.case_id : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
