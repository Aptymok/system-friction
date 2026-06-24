import { NextRequest, NextResponse } from 'next/server';
import { buildScoreFrictionPriorityQueue } from '@/lib/scorefriction/priorityQueue';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/scorefriction/risk-priority';
const DEFAULT_CASE_ID = 'SFI-OPS-001';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id')?.trim() || DEFAULT_CASE_ID;

  try {
    return NextResponse.json({
      ok: true,
      route: ROUTE,
      data: await buildScoreFrictionPriorityQueue({ caseId }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'risk_priority_failed';
    return NextResponse.json({
      ok: false,
      route: ROUTE,
      error: message,
      data: {
        ok: false,
        generated_at: new Date().toISOString(),
        source: 'scorefriction_priority_queue',
        case_id: caseId,
        degraded: true,
        items: [],
      },
    });
  }
}
