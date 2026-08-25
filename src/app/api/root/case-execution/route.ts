import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }

export async function GET() {
  const gate = await requireRootActor('root.case_execution.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const result = await gate.ctx.service
    .from('sfi_case_action_proposals')
    .select('id,case_id,tenant_id,recommendation_ref,action_payload,risk_level,reversibility,status,proposed_by,intervention_ref,return_ref,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(80);

  if (result.error) {
    return NextResponse.json({ ok: false, error: 'case_execution_read_failed', details: result.error.message }, { status: 503 });
  }

  const items = ((result.data ?? []) as Row[]).map((row) => {
    const actionPayload = rec(row.action_payload);
    return {
      id: text(row.id),
      caseId: text(row.case_id),
      tenantId: text(row.tenant_id),
      status: text(row.status) ?? 'UNKNOWN',
      riskLevel: text(row.risk_level) ?? 'UNKNOWN',
      reversibility: text(row.reversibility) ?? 'UNKNOWN',
      action: text(actionPayload.action) ?? 'Case action',
      details: rec(actionPayload.details),
      proposedBy: text(row.proposed_by),
      interventionRef: row.intervention_ref ?? null,
      returnRef: row.return_ref ?? null,
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
      platformPerformedExternalAction: false,
    };
  });

  const counts = Object.fromEntries(['PENDING','APPROVED','REJECTED','CANCELLED','EXECUTED','RETURN_RECORDED'].map((status) => [status, items.filter((item) => item.status === status).length]));

  return NextResponse.json({
    ok: true,
    contract: 'SFI-CASE-ACTION-1.0',
    boundary: {
      automaticExternalExecution: false,
      rootReadOnlySurface: true,
      note: 'This endpoint observes the existing Case Platform intervention/return lifecycle. It does not route or execute action_proposals and does not activate the proposed AI Execution Router.',
    },
    counts: { total: items.length, ...counts },
    items,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
