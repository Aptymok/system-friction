import { NextResponse } from 'next/server';
import { dispatchQueuedProposal } from '@/lib/execution/governedExecutionRouter';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'execute');
  const cred = auth.credential;
  if (!cred) {
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

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const proposalId = String(body.proposal_id || '').trim();
  if (!proposalId) return NextResponse.json({ ok: false, error: 'proposal_id_required' }, { status: 400 });
  if (body.confirm !== true) return NextResponse.json({ ok: false, error: 'explicit_confirmation_required' }, { status: 400 });

  const actor = externalActor(cred);
  const execution = await dispatchQueuedProposal(proposalId);

  if (!execution.ok) {
    const state = String((execution as { state?: unknown }).state ?? 'EXECUTION_BLOCKED');
    const status = state === 'NOT_FOUND' ? 404 : 409;
    return NextResponse.json({
      ok: false,
      error: state.toLowerCase(),
      proposalId,
      actor,
      execution,
      authorityBoundary: {
        proposalMustAlreadyBeQueued: true,
        executeScopeRequired: true,
        scopeExpansionAllowed: false,
        canonicalPromotionAllowed: false,
      },
    }, { status });
  }

  return NextResponse.json({
    ok: true,
    proposalId,
    actor,
    execution,
    authorityBoundary: {
      proposalWasAlreadyQueued: true,
      executeScopeRequired: true,
      scopeExpansionAllowed: false,
      canonicalPromotionAllowed: false,
    },
  });
}
