import { NextRequest, NextResponse } from 'next/server';
import { listScoreFrictionVerifications } from '@/lib/scorefriction/verification-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await listScoreFrictionVerifications(request.nextUrl.searchParams.get('case_id') ?? '');
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
