import { NextResponse } from 'next/server';

import { readEvidenceCandidate, readEvidenceReadiness, readGovernedProposal } from '@/lib/evidence/evidenceCandidates';
import { appendOperationalEvent, stringValue, updateActionProposalStatus } from '@/lib/operational/common';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; candidateId: string }> | { id: string; candidateId: string } };

async function routeIds(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return {
    proposalId: typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null,
    candidateId: typeof params.candidateId === 'string' && params.candidateId.trim() ? params.candidateId.trim() : null,
  };
}

function forwardedAuthHeaders(request: Request) {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const name of ['cookie', 'authorization']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function POST(request: Request, ctx: RouteContext) {
  const gate = await requireRootActor('root.evidence_candidate.accept');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const { proposalId, candidateId } = await routeIds(ctx);
  if (!proposalId || !candidateId) return NextResponse.json({ ok: false, error: 'proposal_and_candidate_required' }, { status: 400 });

  const parent = await readGovernedProposal(proposalId);
  if (!parent.ok || !parent.data) return NextResponse.json({ ok: false, error: parent.error }, { status: 404 });
  const parentStatus = stringValue(parent.data.status);
  if (parentStatus !== 'waiting_evidence' && parentStatus !== 'proposed') {
    return NextResponse.json({ ok: false, error: 'parent_proposal_not_accepting_evidence', parentStatus }, { status: 409 });
  }

  const current = await readEvidenceCandidate(proposalId, candidateId);
  if (!current.ok || !current.candidate) return NextResponse.json({ ok: false, error: current.error }, { status: 404 });
  if (current.candidate.status === 'accepted') {
    const readiness = await readEvidenceReadiness(proposalId);
    return NextResponse.json({ ok: true, duplicate: true, candidate: current.candidate, evidenceReadiness: readiness.readiness, message: 'Evidence candidate was already accepted.' });
  }
  if (current.candidate.status !== 'proposed') {
    return NextResponse.json({ ok: false, error: 'evidence_candidate_not_reviewable', status: current.candidate.status }, { status: 409 });
  }

  const source = current.candidate.source;
  const evidenceResponse = await fetch(new URL('/api/root/evidence', request.url), {
    method: 'POST',
    headers: forwardedAuthHeaders(request),
    cache: 'no-store',
    body: JSON.stringify({
      title: source.title,
      content: [
        source.snippet || 'Accepted source candidate.',
        `Source URL: ${source.url}`,
        `Publisher: ${source.publisher ?? 'unknown'}`,
      ].join('\n\n'),
      evidenceType: 'accepted_external_source',
      relationType: 'contextualizes',
      source: source.url,
      metadata: {
        proposalId,
        candidateProposalId: candidateId,
        publisher: source.publisher,
        publishedAt: source.publishedAt,
        retrievedAt: source.retrievedAt,
        sourceType: source.sourceType,
        reliability: source.reliability,
        referenceHash: source.referenceHash,
        contentHash: null,
        contentType: source.contentType ?? null,
        lastModified: source.lastModified ?? null,
        acquisitionOrigin: current.candidate.acquisitionOrigin,
        acquisitionProvider: current.candidate.acquisitionProvider,
        requestNote: current.candidate.requestNote,
        rootEvidenceCandidateDecision: 'accepted',
        claimBoundary: 'ROOT accepted this source as eligible evidence input. Acceptance does not automatically verify every claim contained in the source.',
      },
    }),
  });
  const evidenceJson = await evidenceResponse.json().catch(() => null) as Record<string, any> | null;
  if (!evidenceResponse.ok || evidenceJson?.ok === false) {
    return NextResponse.json({
      ok: false,
      error: 'canonical_evidence_persistence_failed',
      details: evidenceJson?.error ?? `HTTP ${evidenceResponse.status}`,
      candidate: current.candidate,
    }, { status: 502 });
  }

  const evidenceId = evidenceJson?.data?.evidence?.id ?? evidenceJson?.data?.id ?? null;
  const event = await appendOperationalEvent({
    eventName: 'sfi.evidence_candidate.accepted',
    actorId: gate.ctx.user.id,
    confidence: 1,
    payload: {
      parent_proposal_id: proposalId,
      candidate_proposal_id: candidateId,
      source_url: source.url,
      reference_hash: source.referenceHash,
      root_evidence_id: evidenceId,
      execution_allowed: false,
      canonical_promotion_allowed: false,
    },
    lineage: [proposalId, candidateId],
  });
  if (!event.ok) return NextResponse.json({ ok: false, error: 'candidate_accept_event_failed', evidence: evidenceJson }, { status: 500 });

  const updated = await updateActionProposalStatus({
    proposalId: candidateId,
    status: 'accepted',
    actorId: gate.ctx.user.id,
    isRoot: true,
    proposalType: 'evidence_candidate',
    expectedStatuses: ['proposed'],
    eventId: String(event.data.event_id ?? event.data.id ?? ''),
    payloadPatch: {
      parentProposalId: proposalId,
      decision: 'accept_evidence_candidate',
      rootEvidenceId: evidenceId,
      sourceUrl: source.url,
      referenceHash: source.referenceHash,
      executionAllowed: false,
      canonicalPromotionAllowed: false,
    },
  });
  if (!updated.ok) {
    const details = 'details' in updated ? updated.details : null;
    return NextResponse.json({ ok: false, error: updated.error, details, evidence: evidenceJson }, { status: 409 });
  }

  const readiness = await readEvidenceReadiness(proposalId);
  return NextResponse.json({
    ok: true,
    candidate: updated.data,
    evidence: evidenceJson,
    evidenceReadiness: readiness.readiness,
    message: readiness.readiness?.state === 'SATISFIED'
      ? 'Candidate accepted and evidence gate satisfied. Parent proposal is ready for a separate ROOT decision.'
      : 'Candidate accepted by ROOT and persisted through the canonical evidence writer.',
  });
}
