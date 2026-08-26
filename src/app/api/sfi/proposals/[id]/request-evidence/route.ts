import { NextResponse } from 'next/server';
import { searchEvidenceCandidates } from '@/lib/evidence/evidenceCandidates';
import { decideActionProposal } from '@/lib/governance/proposalLifecycle';
import { controllerCanDecideProposal } from '@/lib/governance/proposalDecisionAuthority';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { requireGovernedActor } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
async function routeId(ctx: RouteContext) { const params = await Promise.resolve(ctx.params); return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null; }

export async function POST(req: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('acp.proposals.request_evidence');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const authority = resolveProposalReviewerAuthority(gate.ctx);
  if (!authority) return NextResponse.json({ ok: false, error: 'proposal_reviewer_required' }, { status: 403 });

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const note = typeof body.evidence_required === 'string' && body.evidence_required.trim() ? body.evidence_required.trim() : 'missing evidence';
  const service = createServiceSupabaseClient();
  const current = await service.from('action_proposals').select('*').eq('id', proposalId).single();
  if (current.error || !current.data) return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });

  if (authority === 'controller' && !controllerCanDecideProposal(current.data)) {
    return NextResponse.json({ ok: false, error: 'root_decision_required', decisionClass: 'root_only' }, { status: 403 });
  }

  const decision = await decideActionProposal({
    proposalId,
    actorId: gate.ctx.user.id,
    actorLabel: gate.ctx.user.email ?? null,
    decision: 'request_evidence',
    decisionAuthority: authority,
    note,
    currentRow: current.data,
  });
  if (!decision.ok) return NextResponse.json(decision, { status: 409 });

  // request_evidence is an active acquisition request, not merely a passive gate.
  // Acquisition is fail-soft: the governance decision remains valid even when a
  // public retrieval provider is temporarily unavailable. ROOT can retry search
  // or add a URL manually without changing the parent proposal decision.
  let acquisition: Awaited<ReturnType<typeof searchEvidenceCandidates>>;
  try {
    acquisition = await searchEvidenceCandidates({
      parentProposalId: proposalId,
      actorId: gate.ctx.user.id,
      requestNote: note,
    });
  } catch (error) {
    acquisition = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      candidates: [],
      warnings: ['automatic_evidence_acquisition_failed'],
    };
  }

  return NextResponse.json({
    ok: true,
    data: decision.data,
    governanceDecision: 'request_evidence',
    evidenceReadiness: acquisition.candidates.length ? 'review_required' : 'acquiring_or_retry_required',
    acquisition,
  });
}
