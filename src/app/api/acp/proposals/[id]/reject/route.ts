import { NextResponse } from 'next/server';
import { decideActionProposal } from '@/lib/governance/proposalLifecycle';
import { controllerCanDecideProposal } from '@/lib/governance/proposalDecisionAuthority';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { requireGovernedActor } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
async function routeId(ctx: RouteContext) { const params = await Promise.resolve(ctx.params); return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null; }

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.reject');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const authority = resolveProposalReviewerAuthority(gate.ctx);
  if (!authority) return NextResponse.json({ ok: false, error: 'proposal_reviewer_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : typeof body.note === 'string' && body.note.trim() ? body.note.trim() : 'acp_rejected';
  const service = createServiceSupabaseClient();
  const current = await service.from('action_proposals').select('*').eq('id', proposalId).single();
  if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });

  if (authority === 'controller' && !controllerCanDecideProposal(current.data)) {
    return NextResponse.json({ ok: false, error: 'root_decision_required', decisionClass: 'root_only' }, { status: 403 });
  }

  const result = await decideActionProposal({
    proposalId,
    actorId: gate.ctx.user.id,
    actorLabel: gate.ctx.user.email ?? null,
    decision: 'deny',
    decisionAuthority: authority,
    note: reason,
    currentRow: current.data,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
