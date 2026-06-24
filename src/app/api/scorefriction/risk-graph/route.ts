import { NextRequest, NextResponse } from 'next/server';
import { buildScoreFrictionRiskGraph } from '@/lib/scorefriction/riskGraph';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/scorefriction/risk-graph';
const DEFAULT_CASE_ID = 'SFI-OPS-001';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id')?.trim() || DEFAULT_CASE_ID;

  try {
    return NextResponse.json({
      ok: true,
      route: ROUTE,
      data: await buildScoreFrictionRiskGraph({ caseId }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'risk_graph_failed';
    return NextResponse.json({
      ok: false,
      route: ROUTE,
      error: message,
      data: {
        ok: false,
        generated_at: new Date().toISOString(),
        source: 'scorefriction_risk_graph',
        case_id: caseId,
        degraded: true,
        degraded_sources: [{ source: 'risk_graph_route', error: message }],
        nodes: [],
        edges: [],
      },
    });
  }
}
