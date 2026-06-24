import { NextResponse } from 'next/server';
import {
  buildPrepareExecutionDiagnostic,
  prepareInternalExecutionLedger,
} from '@/lib/sfi/prepareExecution';

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
    const data = await buildPrepareExecutionDiagnostic({ proposalId });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'sfi_prepare_execution_diagnostic',
      degraded: true,
      degraded_sources: [{ source: 'prepare_execution_route', error: error instanceof Error ? error.message : 'prepare_execution_failed' }],
      proposal_id: proposalId,
      dry_run: true,
      can_prepare_internal_ledger: false,
      external_execution_allowed: false,
      next_safe_action: 'resolve_failed_gates',
    }, { status: 400 });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const data = await prepareInternalExecutionLedger({ proposalId, body });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'sfi_prepare_execution_apply',
      proposal_id: proposalId,
      dry_run: false,
      applied: false,
      execution_id: null,
      perturbation_id: null,
      external_execution_allowed: false,
      next_safe_action: 'resolve_failed_gates',
      warnings: [error instanceof Error ? error.message : 'prepare_execution_apply_failed'],
    }, { status: 400 });
  }
}
