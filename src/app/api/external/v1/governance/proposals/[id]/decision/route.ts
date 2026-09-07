import { NextResponse } from 'next/server';
import { dispatchQueuedProposal } from '@/lib/execution/governedExecutionRouter';
import { decideActionProposal } from '@/lib/governance/proposalLifecycle';
import { queueApprovedProposal } from '@/lib/governance/proposalQueue';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

const REQUIRED_SCOPE = 'governance:decide' as const;
type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sovereignRootProfile(profile: Record<string, unknown> | null) {
  if (!profile) return false;
  const role = typeof profile.role === 'string' ? profile.role.trim().toLowerCase() : '';
  const access = record(profile.module_access);
  return (role === 'root' || role === 'system') && access.full_access === true && access.root === true;
}

export async function POST(req: Request, ctx: RouteContext) {
  const auth = authorizeExternalRequest(req, REQUIRED_SCOPE);
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, REQUIRED_SCOPE), { status: 401 });

  const credential = auth.credential;
  if (credential.authMethod !== 'oauth' || !credential.subjectId || credential.role !== 'root_delegate' || credential.tenantId !== 'sfi') {
    return NextResponse.json({
      ok: false,
      error: 'sovereign_root_oauth_required',
      scopeAllowed: auth.scopeAllowed,
      authMethod: credential.authMethod ?? null,
      role: credential.role ?? null,
      tenantId: credential.tenantId ?? null,
    }, { status: 403 });
  }

  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const decision = body.decision === 'accept' || body.decision === 'deny' ? body.decision : null;
  if (!decision) return NextResponse.json({ ok: false, error: 'decision_must_be_accept_or_deny' }, { status: 400 });
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : decision === 'deny' ? 'external_root_denied' : null;

  const service = createServiceSupabaseClient();
  const profileRead = await service
    .from('profiles')
    .select('user_id,email,role,module_access')
    .eq('user_id', credential.subjectId)
    .maybeSingle();
  if (profileRead.error) {
    return NextResponse.json({ ok: false, error: 'root_profile_read_failed', details: profileRead.error.message }, { status: 503 });
  }
  if (!sovereignRootProfile(profileRead.data as Record<string, unknown> | null)) {
    return NextResponse.json({ ok: false, error: 'sovereign_root_authority_required' }, { status: 403 });
  }

  const current = await service.from('action_proposals').select('*').eq('id', proposalId).single();
  if (current.error || !current.data) {
    return NextResponse.json({ ok: false, error: current.error?.message ?? 'proposal_not_found' }, { status: 404 });
  }

  const actorId = credential.subjectId;
  const actorLabel = typeof profileRead.data?.email === 'string' ? profileRead.data.email : credential.actorId ?? null;
  const decided = await decideActionProposal({
    proposalId,
    actorId,
    actorLabel,
    decision,
    decisionAuthority: 'root',
    note,
    currentRow: current.data,
  });
  if (!decided.ok) return NextResponse.json(decided, { status: 409 });

  if (decision === 'deny') {
    return NextResponse.json({
      ok: true,
      data: decided.data,
      decision: { decision, authority: 'root', actorId, actorLabel, scope: REQUIRED_SCOPE },
    });
  }

  const queued = await queueApprovedProposal({
    proposalId,
    actorId,
    actorLabel,
    decisionAuthority: 'root',
    currentRow: decided.data as Record<string, unknown>,
    note,
  });
  if (!queued.ok) {
    return NextResponse.json({
      ok: false,
      error: 'proposal_approved_but_queue_transition_failed',
      decisionRecorded: true,
      decision: decided.data,
      queueError: queued,
    }, { status: 409 });
  }

  const execution = await dispatchQueuedProposal(proposalId).catch((error) => ({
    ok: false as const,
    state: 'DISPATCH_FAILED',
    proposalId,
    error: error instanceof Error ? error.message : String(error),
  }));

  return NextResponse.json({
    ok: true,
    data: queued.data,
    decision: { decision, authority: 'root', actorId, actorLabel, scope: REQUIRED_SCOPE },
    execution,
  });
}
