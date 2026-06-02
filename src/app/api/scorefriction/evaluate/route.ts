import { NextRequest, NextResponse } from 'next/server';
import { evaluateScoreFrictionCase, evaluateScoreFrictionObservation } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id');
  if (!caseId) return NextResponse.json({ error: 'case_id_required' }, { status: 400 });

  const result = await evaluateScoreFrictionCase(caseId);
  if (!result) return NextResponse.json({ error: 'case_not_found', case_id: caseId }, { status: 404 });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = await evaluateScoreFrictionObservation(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
