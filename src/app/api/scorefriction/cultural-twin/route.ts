import { NextRequest, NextResponse } from 'next/server';
import { listScoreFrictionCulturalHypotheses } from '@/lib/scorefriction/cultural-twin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await listScoreFrictionCulturalHypotheses(request.nextUrl.searchParams.get('case_id') ?? '');
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
