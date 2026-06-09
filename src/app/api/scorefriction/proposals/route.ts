import { NextRequest, NextResponse } from 'next/server';
import { listScoreFrictionProposals } from '@/lib/scorefriction/proposal-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await listScoreFrictionProposals(request.nextUrl.searchParams.get('case_id') ?? '');
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
