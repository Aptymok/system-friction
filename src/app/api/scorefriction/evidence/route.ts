import { NextRequest, NextResponse } from 'next/server';
import { readScoreFrictionEvidence } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id');
  if (!caseId) return NextResponse.json({ error: 'case_id_required' }, { status: 400 });

  const result = await readScoreFrictionEvidence(caseId);
  return NextResponse.json(result);
}
