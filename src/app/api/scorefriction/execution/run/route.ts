import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { runLowInjectionPipeline } from '@/lib/sfi/runtime/lowInjectionRuntime';
import { persistSfiPipelineExecution } from '@/lib/sfi/persistence/sfiExecutionPersistence';

export const dynamic = 'force-dynamic';

async function execute(input: Record<string, unknown>) {
  const result = await runLowInjectionPipeline(input);
  const text = (value: unknown) => typeof value === 'string' ? value : undefined;
  const persistence = await persistSfiPipelineExecution({
    case_id: typeof input.case_id === 'string' ? input.case_id : 'SFI-OP-LOCAL',
    proposal_id: result.proposal?.proposal_id,
    requested_assets: Array.isArray(input.requested_assets) ? input.requested_assets.map(String) : undefined,
    material: result.material,
    media: {},
    perturbation_type: text(input.perturbation_type),
    target_domain: text(input.target_domain),
    minimal_action: text(input.minimal_action),
    expected_effect: text(input.expected_effect),
    risk_level: text(input.risk_level),
    source_pipeline: result,
  });
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    case_id: typeof input.case_id === 'string' ? input.case_id : null,
    event_type: 'execution_run',
    title: 'ScoreFriction execution run',
    summary: result.status === 'BLOCKED' ? 'Ejecucion bloqueada por capacidades faltantes.' : 'Ejecucion ScoreFriction registrada.',
    payload: { result, persistence },
  });
  return { ok: result.status !== 'BLOCKED', result, persistence };
}

export async function GET() {
  return NextResponse.json(await execute({ case_id: 'SFI-OP-LOCAL' }));
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await execute(input));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'pipeline_failed' }, { status: 500 });
  }
}
