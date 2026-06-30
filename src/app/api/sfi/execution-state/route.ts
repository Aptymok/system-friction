import { NextRequest, NextResponse } from 'next/server';
import { readSfiExecutionState } from '@/lib/sfi/persistence/sfiExecutionPersistence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id');
  if (!caseId) return NextResponse.json({ ok: false, error: 'case_id is required' }, { status: 400 });
  const state = await readSfiExecutionState(caseId);
  return NextResponse.json(state, { status: 200 });
}
