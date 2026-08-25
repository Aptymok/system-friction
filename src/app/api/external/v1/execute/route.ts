import { NextResponse } from 'next/server';
import { recordValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'execute');
  const cred = auth.credential;
  if (!cred) {
    return NextResponse.json({ ok: false, error: 'unauthorized', auth: { tokenPresent: auth.tokenPresent, registryConfigured: auth.registryConfigured, scopeAllowed: auth.scopeAllowed, acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'] } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const proposalId = String(body.proposal_id || '').trim();
  if (!proposalId) return NextResponse.json({ ok: false, error: 'proposal_id_required' }, { status: 400 });
  if (body.confirm !== true) return NextResponse.json({ ok: false, error: 'explicit_confirmation_required' }, { status: 400 });

  const db = createServiceSupabaseClient();
  const read = await db.from('action_proposals').select('*').eq('id', proposalId).eq('status', 'queued').maybeSingle();
  if (read.error) return NextResponse.json({ ok: false, error: 'proposal_read_failed', details: read.error.message }, { status: 400 });
  if (!read.data) return NextResponse.json({ ok: false, error: 'queued_governed_proposal_required', message: 'La IA no puede aprobar su propia propuesta. Se requiere una propuesta gobernada en estado queued.' }, { status: 409 });

  const current = read.data as Record<string, unknown>;
  const outcome = recordValue(current.outcome);
  const patch = recordValue(outcome.payloadPatch);
  const plan = recordValue(patch.executionPlan);
  const assignment = recordValue(patch.assignment);
  const declaredAdapter = text(assignment.adapter ?? assignment.executorRoute ?? assignment.executor_route ?? plan.adapter ?? plan.executorRoute ?? plan.executor_route);
  const actor = externalActor(cred);

  return NextResponse.json({
    ok: false,
    error: declaredAdapter ? 'execution_dispatch_not_implemented' : 'execution_adapter_required',
    proposalId,
    actor,
    status: 'queued',
    declaredAdapter,
    mutated: false,
    executedAtWritten: false,
    canonicalPromotionAllowed: false,
    externalActionAllowed: false,
    reservedCapability: {
      proposalId: '87cc094a-e9df-40e8-9a35-92c679c60ef2',
      name: 'AI Execution Router',
      activatedByThisRoute: false,
    },
    next: declaredAdapter
      ? 'A persisted adapter is declared, but this generic endpoint does not dispatch it. Use the adapter-specific governed execution path, then POST the observed RETURN to /api/external/v1/proposal-return.'
      : 'No proposal-specific execution adapter is persisted. The proposal remains queued. Bind or implement a governed adapter before claiming execution.',
    plan,
  }, { status: 409 });
}
