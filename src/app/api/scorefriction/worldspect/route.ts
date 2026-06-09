import { NextRequest, NextResponse } from 'next/server';
import { readScoreFrictionWorldspect } from '@/lib/scorefriction/worldspect-convergence';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await readScoreFrictionWorldspect(request.nextUrl.searchParams.get('case_id') ?? '');
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
