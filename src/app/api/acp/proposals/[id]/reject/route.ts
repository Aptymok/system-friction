import { NextResponse } from 'next/server';
import { decideActionProposal } from '@/lib/governance/proposalLifecycle';
import { requireGovernedActor } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
async function routeId(ctx: RouteContext) { const params = await Promise.resolve(ctx.params); return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null; }

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.reject');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'acp_rejected';
  const service = createServiceSupabaseClient();
  const current = await service.from('action_proposals').select('*').eq('id', proposalId).single();
  if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });
  const result = await decideActionProposal({ proposalId, actorId: gate.ctx.user.id, decision: 'deny', note: reason, currentRow: current.data });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
