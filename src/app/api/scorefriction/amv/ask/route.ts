import { NextResponse } from 'next/server';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { answerOperationalQuestion } from '@/lib/scorefriction/actionableAnalysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = await buildOperationalCycle({
    case_id: typeof body.case_id === 'string' ? body.case_id : 'SFI-OP-LOCAL',
    objective: typeof body.objective === 'string' ? body.objective : null,
    scope: body.scope,
    analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
    evaluated_object: body.evaluated_object ?? body.text ?? '',
    run_contrast: true,
  });
  const answer = answerOperationalQuestion(String(body.question ?? ''), state.operational_analysis as Record<string, unknown>);
  return NextResponse.json({ ok: true, answer, state });
}