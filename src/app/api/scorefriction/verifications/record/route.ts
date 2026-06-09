import { NextRequest, NextResponse } from 'next/server';
import { recordScoreFrictionProposalVerification } from '@/lib/scorefriction/verification-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await recordScoreFrictionProposalVerification(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
