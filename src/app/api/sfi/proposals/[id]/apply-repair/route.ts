import { NextResponse } from 'next/server';
import { applyProposalTraceRepair } from '@/lib/sfi/proposalTraceRepair';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

export async function POST(req: Request, ctx: RouteContext) {
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const data = await applyProposalTraceRepair({ proposalId, body });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'sfi_proposal_trace_repair_apply',
      proposal_id: proposalId,
      dry_run: false,
      applied: false,
      audit_id: null,
      updated_fields: [],
      external_execution_allowed: false,
      can_prepare_execution: false,
      next_safe_action: 'review_repair_draft',
      warnings: [error instanceof Error ? error.message : 'apply_repair_failed'],
    }, { status: 400 });
  }
}
