import { NextRequest, NextResponse } from 'next/server';
import { evaluateScoreFrictionObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await evaluateScoreFrictionObservation(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
