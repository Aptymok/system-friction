import { NextRequest, NextResponse } from 'next/server';
import { buildOperationalCycle, persistOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import type { OperationalCycleInput } from '@/lib/scorefriction/contracts/operationalCycle';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const case_id = request.nextUrl.searchParams.get('case_id') ?? 'SFI-OP-LOCAL';
  const scope = request.nextUrl.searchParams.get('scope') ?? 'culture';
  const state = await buildOperationalCycle({ case_id, scope, analysis_modes: ['WSV', 'SCOREFRICTION', 'AMV'] } as Partial<OperationalCycleInput>);
  return NextResponse.json({ ok: true, state });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const input: OperationalCycleInput = {
    case_id: typeof body.case_id === 'string' ? body.case_id : 'SFI-OP-LOCAL',
    user_id: typeof body.user_id === 'string' ? body.user_id : null,
    objective: typeof body.objective === 'string' ? body.objective : null,
    scope: body.scope,
    analysis_modes: Array.isArray(body.analysis_modes) ? body.analysis_modes : ['WSV', 'SCOREFRICTION', 'AMV'],
    evidence_input: body.evidence_input,
    evaluated_object: body.evaluated_object,
    run_contrast: Boolean(body.run_contrast),
  };
  const result = await persistOperationalCycle(input);
  return NextResponse.json({ ok: true, ...result });
}

