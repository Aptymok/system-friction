import { NextResponse } from 'next/server';

import { inspectUrlCandidate } from '@/lib/evidence/evidenceCandidates';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = authorizeExternalRequest(request, 'propose');
  const credential = auth.credential;
  if (!credential) {
    return NextResponse.json({
      ok: false,
      error: 'unauthorized',
      auth: {
        tokenPresent: auth.tokenPresent,
        registryConfigured: auth.registryConfigured,
        scopeAllowed: auth.scopeAllowed,
        acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'],
      },
    }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const proposalId = typeof body.proposal_id === 'string' ? body.proposal_id.trim() : '';
  const sourceUrl = typeof body.source_url === 'string' ? body.source_url.trim() : '';
  if (!proposalId || !sourceUrl) {
    return NextResponse.json({ ok: false, error: 'proposal_id_and_source_url_required' }, { status: 400 });
  }

  const result = await inspectUrlCandidate({
    parentProposalId: proposalId,
    actorId: externalActor(credential),
    url: sourceUrl,
    title: typeof body.title === 'string' ? body.title : null,
    requestNote: typeof body.evidence_note === 'string' && body.evidence_note.trim()
      ? body.evidence_note.trim()
      : 'Evidence candidate proposed by an authorized external agent for ROOT review.',
    acquisitionOrigin: 'external_agent',
    acquisitionProvider: credential.label || 'external_agent_gateway',
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({
    ok: true,
    data: result.data,
    duplicate: result.duplicate ?? false,
    humanApprovalRequired: true,
    executionAllowed: false,
    message: 'Evidence candidate registered for ROOT review. It has not been accepted as evidence.',
  }, { status: result.duplicate ? 200 : 201 });
}
