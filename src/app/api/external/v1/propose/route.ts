import { NextResponse } from 'next/server';
import { createActionProposal } from '@/lib/operational/common';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'propose');
  const cred = auth.credential;
  if (!cred) {
    return NextResponse.json({ ok: false, error: 'unauthorized', auth: { tokenPresent: auth.tokenPresent, registryConfigured: auth.registryConfigured, scopeAllowed: auth.scopeAllowed, acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'] } }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(body.title || '').trim();
  const summary = String(body.summary || '').trim();
  if (!title || !summary) return NextResponse.json({ ok: false, error: 'title_and_summary_required' }, { status: 400 });
  const actor = externalActor(cred);
  const result = await createActionProposal({
    proposalType: 'external_agent_proposal',
    actorId: actor,
    title,
    objective: summary,
    status: 'proposed',
    payload: { summary, requested_action: body.action ?? null, source: 'external_agent_gateway', credential_label: cred.label || 'external-agent', submitted_at: new Date().toISOString(), human_approval_required: true },
  });
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json({ ok: true, data: result.data, message: 'Propuesta registrada. ROOT debe decidir antes de cualquier realización.' }, { status: 201 });
}
