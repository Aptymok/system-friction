import { NextResponse } from 'next/server';

import {
  inspectUrlCandidate,
  listEvidenceCandidates,
  searchEvidenceCandidates,
} from '@/lib/evidence/evidenceCandidates';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

function readiness(candidates: Array<{ status: string }>) {
  const proposed = candidates.filter((candidate) => candidate.status === 'proposed').length;
  const accepted = candidates.filter((candidate) => candidate.status === 'accepted').length;
  const rejected = candidates.filter((candidate) => candidate.status === 'rejected').length;
  if (!candidates.length) return { state: 'acquiring_or_retry_required', proposed, accepted, rejected };
  if (proposed > 0) return { state: 'review_required', proposed, accepted, rejected };
  if (accepted > 0) return { state: 'ready_for_reassessment', proposed, accepted, rejected };
  return { state: 'insufficient', proposed, accepted, rejected };
}

export async function GET(_request: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('sfi.evidence_candidates.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const authority = resolveProposalReviewerAuthority(gate.ctx);
  if (!authority) return NextResponse.json({ ok: false, error: 'proposal_reviewer_required' }, { status: 403 });
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  const result = await listEvidenceCandidates(proposalId, 150);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json({ ...result, evidenceReadiness: readiness(result.candidates) });
}

export async function POST(request: Request, ctx: RouteContext) {
  const gate = await requireGovernedActor('sfi.evidence_candidates.acquire');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const authority = resolveProposalReviewerAuthority(gate.ctx);
  if (!authority) return NextResponse.json({ ok: false, error: 'proposal_reviewer_required' }, { status: 403 });
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : 'search';
  const requestNote = typeof body.request_note === 'string' && body.request_note.trim()
    ? body.request_note.trim()
    : 'Se requiere evidencia suficiente antes de decidir.';

  if (action === 'search') {
    const result = await searchEvidenceCandidates({
      parentProposalId: proposalId,
      actorId: gate.ctx.user.id,
      requestNote,
    });
    const current = await listEvidenceCandidates(proposalId, 150);
    return NextResponse.json({
      ...result,
      evidenceReadiness: current.ok ? readiness(current.candidates) : { state: 'unknown', proposed: 0, accepted: 0, rejected: 0 },
    }, { status: result.ok ? 200 : 207 });
  }

  if (action === 'add_url') {
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) return NextResponse.json({ ok: false, error: 'source_url_required' }, { status: 400 });
    const result = await inspectUrlCandidate({
      parentProposalId: proposalId,
      actorId: gate.ctx.user.id,
      url,
      title: typeof body.title === 'string' ? body.title : null,
      requestNote,
      acquisitionOrigin: 'manual_url',
      acquisitionProvider: 'root_manual_url',
    });
    const current = await listEvidenceCandidates(proposalId, 150);
    return NextResponse.json({
      ...result,
      evidenceReadiness: current.ok ? readiness(current.candidates) : { state: 'unknown', proposed: 0, accepted: 0, rejected: 0 },
    }, { status: result.ok ? 201 : 400 });
  }

  return NextResponse.json({ ok: false, error: 'unsupported_evidence_candidate_action', supported: ['search', 'add_url'] }, { status: 400 });
}
