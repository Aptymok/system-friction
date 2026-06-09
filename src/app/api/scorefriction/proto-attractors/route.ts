import { NextRequest, NextResponse } from 'next/server';
import { listScoreFrictionProtoAttractors } from '@/lib/scorefriction/proto-attractors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id') ?? '';
  const result = await listScoreFrictionProtoAttractors(caseId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
