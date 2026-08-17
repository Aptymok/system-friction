import { NextResponse } from 'next/server';

import {
  createReturnCertificate,
  invalidateReturnCertificate,
  listReturnCertificates,
  publishReturnCertificate,
  verifyReturnCertificate,
} from '@/lib/returns/returnCertificateService';
import { asRecord, auditRootAction, requireRootActor, stringValue } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.returns.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const data = await listReturnCertificates();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.returns.mutate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = asRecord(await request.json().catch(() => ({})));
  const intent = stringValue(body.intent);
  const payload = asRecord(body.payload);
  if (!intent) return NextResponse.json({ ok: false, error: 'return_intent_required' }, { status: 400 });

  const result = intent === 'create'
    ? await createReturnCertificate(payload, gate.ctx.user.id)
    : intent === 'publish'
      ? await publishReturnCertificate(payload, gate.ctx.user.id)
      : intent === 'verify'
        ? await verifyReturnCertificate(payload, gate.ctx.user.id)
        : intent === 'invalidate'
          ? await invalidateReturnCertificate(payload, gate.ctx.user.id)
          : { ok: false as const, error: 'return_intent_unknown' };

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const target = stringValue(payload.certificateId) ?? 'public_return_certificate';
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: `returns.${intent}`,
    target,
    payload: { intent, target },
    request,
  });

  if (!audit.ok) {
    return NextResponse.json({
      ok: false,
      error: 'return_mutation_persisted_but_audit_failed',
      mutation: result.data,
      audit,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: result.data, audit });
}
