import { NextResponse } from 'next/server';

import { readEvidenceCandidate } from '@/lib/evidence/evidenceCandidates';
import { appendOperationalEvent, updateActionProposalStatus } from '@/lib/operational/common';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; candidateId: string }> | { id: string; candidateId: string } };

async function routeIds(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return {
    proposalId: typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null,
    candidateId: typeof params.candidateId === 'string' && params.candidateId.trim() ? params.candidateId.trim() : null,
  };
}

export async function POST(request: Request, ctx: RouteContext) {
  const gate = await requireRootActor('root.evidence_candidate.reject');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const { proposalId, candidateId } = await routeIds(ctx);
  if (!proposalId || !candidateId) return NextResponse.json({ ok: false, error: 'proposal_and_candidate_required' }, { status: 400 });
  const current = await readEvidenceCandidate(proposalId, candidateId);
  if (!current.ok || !current.candidate) return NextResponse.json({ ok: false, error: current.error }, { status: 404 });
  if (current.candidate.status === 'rejected') return NextResponse.json({ ok: true, duplicate: true, candidate: current.candidate });
  if (current.candidate.status !== 'proposed') {
    return NextResponse.json({ ok: false, error: 'evidence_candidate_not_reviewable', status: current.candidate.status }, { status: 409 });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Rejected by ROOT during evidence review.';
  const event = await appendOperationalEvent({
    eventName: 'sfi.evidence_candidate.rejected',
    actorId: gate.ctx.user.id,
    confidence: 1,
    payload: {
      parent_proposal_id: proposalId,
      candidate_proposal_id: candidateId,
      source_url: current.candidate.source.url,
      reference_hash: current.candidate.source.referenceHash,
      reason,
      execution_allowed: false,
      canonical_promotion_allowed: false,
    },
    lineage: [proposalId, candidateId],
  });
  if (!event.ok) return NextResponse.json(event, { status: 500 });
  const updated = await updateActionProposalStatus({
    proposalId: candidateId,
    status: 'rejected',
    actorId: gate.ctx.user.id,
    isRoot: true,
    proposalType: 'evidence_candidate',
    expectedStatuses: ['proposed'],
    eventId: String(event.data.event_id ?? event.data.id ?? ''),
    payloadPatch: {
      parentProposalId: proposalId,
      decision: 'reject_evidence_candidate',
      reason,
      sourceUrl: current.candidate.source.url,
      referenceHash: current.candidate.source.referenceHash,
      executionAllowed: false,
    },
  });
  return NextResponse.json(updated, { status: updated.ok ? 200 : 409 });
}
