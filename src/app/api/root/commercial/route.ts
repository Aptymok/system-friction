import { NextResponse } from 'next/server';

import {
  createCommercialClient,
  createCommercialOpportunity,
  createCommercialProposal,
  readCommercialWorkspace,
  transitionCommercialProposal,
} from '@/lib/commercial/commercialService';
import { runClientFinderAgent } from '@/lib/agents/sfiAgents';
import { asRecord, auditRootAction, requireRootActor, stringValue } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function buildMailto(recipient: string, subject: string, body: string) {
  const query = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(recipient)}?${query.toString()}`;
}

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

  let result: { ok: boolean; data?: unknown; error?: string; details?: string };

  if (intent === 'analyze_signal') {
    const analysis = await runClientFinderAgent({
      entityName: text(payload.entityName) || undefined,
      personOrRole: text(payload.personOrRole) || undefined,
      sector: text(payload.sector) || undefined,
      publicSignal: text(payload.publicSignal) || undefined,
      source: text(payload.source) || undefined,
      notes: text(payload.notes) || undefined,
    });
    result = { ok: analysis.ok, data: analysis };
  } else if (intent === 'create_client') {
    result = await createCommercialClient(payload, gate.ctx.user.id);
  } else if (intent === 'create_opportunity') {
    result = await createCommercialOpportunity(payload, gate.ctx.user.id);
  } else if (intent === 'create_proposal') {
    result = await createCommercialProposal(payload, gate.ctx.user.id);
  } else if (intent === 'transition_proposal') {
    result = await transitionCommercialProposal(payload, gate.ctx.user.id);
  } else if (intent === 'mail_draft') {
    const recipient = text(payload.recipient);
    const company = text(payload.company, 'la organización');
    const role = text(payload.role, 'equipo responsable');
    const pain = text(payload.pain, 'una fricción operacional observable');
    const offer = text(payload.offer, 'SFI-DR01');
    const subject = text(payload.subject, `Lectura operativa para ${company}`);
    const message = text(payload.message, [
      `${role}:`,
      '',
      `System Friction Institute observó una señal compatible con ${pain}.`,
      '',
      `La propuesta es realizar ${offer} como diagnóstico delimitado, con evidencia, trazabilidad y una intervención mínima verificable.`,
      '',
      'La sesión inicial requiere 45 minutos y no implica una implementación tecnológica previa.',
      '',
      'Juan Antonio Marín Liera',
      'Founder · System Friction Institute',
    ].join('\n'));

    result = {
      ok: true,
      data: {
        recipient,
        subject,
        body: message,
        mailto: buildMailto(recipient, subject, message),
        transport: 'system_mail_client',
        requiresRecipient: !recipient,
      },
    };
  } else {
    result = { ok: false, error: 'commercial_intent_unknown' };
  }

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const target =
    stringValue(payload.proposalId)
    ?? stringValue(payload.opportunityId)
    ?? stringValue(payload.clientId)
    ?? stringValue(payload.entityName)
    ?? stringValue(payload.company)
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
