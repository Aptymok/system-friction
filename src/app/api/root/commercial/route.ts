import { NextResponse } from 'next/server';

import {
  createCommercialClient,
  createCommercialOpportunity,
  createCommercialProposal,
  readCommercialWorkspace,
  transitionCommercialProposal,
} from '@/lib/commercial/commercialService';
import { asRecord, auditRootAction, requireRootActor, stringValue } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.commercial.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const data = await readCommercialWorkspace();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.commercial.mutate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = asRecord(await request.json().catch(() => ({})));
  const intent = stringValue(body.intent);
  const payload = asRecord(body.payload);
  if (!intent) return NextResponse.json({ ok: false, error: 'commercial_intent_required' }, { status: 400 });

  const result =
    intent === 'create_client' ? await createCommercialClient(payload, gate.ctx.user.id)
      : intent === 'create_opportunity' ? await createCommercialOpportunity(payload, gate.ctx.user.id)
        : intent === 'create_proposal' ? await createCommercialProposal(payload, gate.ctx.user.id)
          : intent === 'transition_proposal' ? await transitionCommercialProposal(payload, gate.ctx.user.id)
            : { ok: false as const, error: 'commercial_intent_unknown' };

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const target =
    stringValue(payload.proposalId)
    ?? stringValue(payload.opportunityId)
    ?? stringValue(payload.clientId)
    ?? 'commercial_workspace';

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: `commercial.${intent}`,
    target,
    payload: { intent, target },
    request,
  });

  if (!audit.ok) {
    return NextResponse.json({
      ok: false,
      error: 'commercial_mutation_persisted_but_audit_failed',
      mutation: result.data,
      audit,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: result.data, audit });
}
