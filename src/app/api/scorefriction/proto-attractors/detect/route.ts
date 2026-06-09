import { NextRequest, NextResponse } from 'next/server';
import { detectScoreFrictionProtoAttractors } from '@/lib/scorefriction/proto-attractors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await detectScoreFrictionProtoAttractors(String(body.case_id ?? body.caseId ?? ''));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
