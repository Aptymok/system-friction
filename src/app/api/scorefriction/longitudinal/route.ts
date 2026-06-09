import { NextRequest, NextResponse } from 'next/server';
import { listScoreFrictionLongitudinal } from '@/lib/scorefriction/longitudinal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await listScoreFrictionLongitudinal(request.nextUrl.searchParams.get('case_id') ?? '');
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
