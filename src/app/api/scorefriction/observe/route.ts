import { NextRequest, NextResponse } from 'next/server';
import { recordScoreFrictionObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await recordScoreFrictionObservation(body);
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
