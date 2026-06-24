import { NextRequest, NextResponse } from 'next/server';
import { buildOperationalCycle, persistOperationalCycle, normalizeScope } from '@/lib/scorefriction/operationalCycle';
import type { AnalysisMode } from '@/lib/scorefriction/contracts/operationalCycle';

export const dynamic = 'force-dynamic';

function modes(value: unknown): AnalysisMode[] {
  if (!Array.isArray(value)) return ['MIHM', 'PSI', 'WORLDSPECT', 'SCOREFRICTION', 'AMV'];
  return value.filter((item): item is AnalysisMode => ['MIHM', 'PSI', 'WORLDSPECT', 'SCOREFRICTION', 'AMV'].includes(String(item) as AnalysisMode));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = await buildOperationalCycle({
    case_id: url.searchParams.get('case_id') ?? 'SFI-OP-LOCAL',
    objective: url.searchParams.get('objective'),
    scope: normalizeScope(url.searchParams.get('scope')),
    analysis_modes: ['MIHM', 'PSI', 'WORLDSPECT', 'SCOREFRICTION', 'AMV'],
    user_question: url.searchParams.get('q'),
    run_contrast: false,
  });
  if (url.searchParams.get('format') === 'markdown') {
    return new NextResponse(state.formal_report?.markdown ?? '# ScoreFriction Report\n\nNo report.', {
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': `attachment; filename="${state.formal_report?.filename ?? 'scorefriction-report.md'}"`,
      },
    });
  }
  return NextResponse.json({ ok: true, state });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const input = {
    case_id: typeof body.case_id === 'string' ? body.case_id : `SFI-${Date.now().toString(36)}`,
    user_id: typeof body.user_id === 'string' ? body.user_id : null,
    objective: typeof body.objective === 'string' ? body.objective : null,
    scope: normalizeScope(body.scope),
    analysis_modes: modes(body.analysis_modes),
    evidence_input: body.evidence_input,
    evaluated_object: body.evaluated_object,
    user_question: typeof body.user_question === 'string' ? body.user_question : null,
    run_contrast: Boolean(body.run_contrast),
  };
  const result = await persistOperationalCycle(input);
  return NextResponse.json({ ok: true, ...result });
}