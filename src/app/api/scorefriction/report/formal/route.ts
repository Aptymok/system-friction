import { NextResponse } from 'next/server';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { buildFormalReportMarkdown } from '@/lib/scorefriction/actionableAnalysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = await buildOperationalCycle({
    case_id: typeof body.case_id === 'string' ? body.case_id : `REPORT-${Date.now().toString(36)}`,
    objective: typeof body.objective === 'string' ? body.objective : null,
    scope: body.scope,
    analysis_modes: Array.isArray(body.analysis_modes) ? body.analysis_modes : ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
    evaluated_object: body.evaluated_object ?? body.text ?? body.object ?? '',
    run_contrast: true,
  });
  const markdown = buildFormalReportMarkdown(state as Record<string, unknown>);
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="scorefriction-report-${state.case_id}.md"`,
    },
  });
}