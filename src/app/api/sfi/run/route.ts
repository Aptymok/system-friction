import { NextRequest, NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { persistSfiPipelineExecution } from '@/lib/sfi/persistence/sfiExecutionPersistence';
import { runLowInjectionPipeline } from '@/lib/sfi/runtime/lowInjectionRuntime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function execute(input: Record<string, unknown>) {
  const result = await runLowInjectionPipeline(input);
  const persistence = await persistSfiPipelineExecution({
    case_id: stringValue(input.case_id) ?? 'SFI-OP-LOCAL',
    proposal_id: result.proposal?.proposal_id,
    requested_assets: Array.isArray(input.requested_assets) ? input.requested_assets.map(String) : undefined,
    material: result.material,
    media: {},
    perturbation_type: stringValue(input.perturbation_type),
    target_domain: stringValue(input.target_domain),
    minimal_action: stringValue(input.minimal_action),
    expected_effect: stringValue(input.expected_effect),
    risk_level: stringValue(input.risk_level),
    source_pipeline: result,
  });

  await appendLogbookEntry({
    scope: 'root',
    visibility: 'root',
    case_id: stringValue(input.case_id) ?? null,
    event_type: 'sfi_execution_run',
    title: 'SFI execution run',
    summary: result.status === 'BLOCKED' ? 'SFI execution blocked by capability gap.' : 'SFI execution registered.',
    payload: { result, persistence },
  }).catch(() => null);

  return { ok: result.status !== 'BLOCKED' && persistence.supabaseOk, result, persistence };
}

export async function GET() {
  // GET must never trigger persistent work, even for an authenticated caller.
  return NextResponse.json({ ok: false, error: 'method_not_allowed' }, {
    status: 405, headers: { Allow: 'POST' },
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('root.sfi.run.execute');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const input = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await execute(input && typeof input === 'object' ? input as Record<string, unknown> : {}));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'sfi_run_failed' }, { status: 500 });
  }
}
