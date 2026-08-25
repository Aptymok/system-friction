import { NextResponse } from 'next/server';
import { controllerCanDecideProposal } from '@/lib/governance/proposalDecisionAuthority';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { queueApprovedProposal } from '@/lib/governance/proposalQueue';
import { requireGovernedActor } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim().length > 0 ? params.id.trim() : null;
}

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.prepare');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const authority = resolveProposalReviewerAuthority(gate.ctx);
  if (!authority) return NextResponse.json({ ok: false, error: 'proposal_reviewer_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : 'legacy_design_approved_queue_transition';

  const service = createServiceSupabaseClient();
  const current = await service.from('action_proposals').select('*').eq('id', proposalId).eq('status', 'design_approved').maybeSingle();
  if (current.error) return NextResponse.json({ ok: false, error: 'proposal_lookup_failed', details: current.error.message }, { status: 400 });
  if (!current.data) return NextResponse.json({ ok: false, error: 'design_approved_proposal_not_found' }, { status: 404 });

  if (authority === 'controller' && !controllerCanDecideProposal(current.data)) {
    return NextResponse.json({ ok: false, error: 'root_decision_required', decisionClass: 'root_only' }, { status: 403 });
  }

  const queued = await queueApprovedProposal({
    proposalId,
    actorId: gate.ctx.user.id,
    actorLabel: gate.ctx.user.email ?? null,
    decisionAuthority: authority,
    currentRow: current.data,
    note,
  });
  return NextResponse.json(queued, { status: queued.ok ? 200 : 409 });
}
