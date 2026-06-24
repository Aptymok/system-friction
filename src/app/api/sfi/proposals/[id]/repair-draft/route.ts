import { NextResponse } from 'next/server';
import { buildProposalTraceRepair } from '@/lib/sfi/proposalTraceRepair';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  try {
    const data = await buildProposalTraceRepair(proposalId);
    const { internal: _internal, ...publicData } = data;
    return NextResponse.json(publicData);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'sfi_proposal_trace_repair',
      degraded: true,
      degraded_sources: [{ source: 'repair_draft_route', error: error instanceof Error ? error.message : 'repair_draft_failed' }],
      proposal_id: proposalId,
      current_response: {
        decision: 'unavailable',
        blocking_condition: null,
        external_execution_allowed: false,
      },
      can_write: false,
      can_prepare_execution: false,
      next_safe_action: 'review_repair_draft',
    }, { status: 400 });
  }
}
