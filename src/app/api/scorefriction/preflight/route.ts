import { NextRequest, NextResponse } from 'next/server';
import { preflightScoreFrictionObservation } from '@/lib/scorefriction/preflight';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = preflightScoreFrictionObservation(body);
  return NextResponse.json(result, { status: 200 });
}
