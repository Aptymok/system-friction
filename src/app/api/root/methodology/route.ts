import { NextResponse } from 'next/server';
import { asRecord, auditRootAction, requireRootActor, stringValue } from '@/lib/root/server';
import { canCreatePhenomenon, openPhenomenon } from '@/lib/ppoi/ppoiService';
import { resolveRootCaseMethodology } from '@/lib/mihm/rootCaseMethodology';
import { readAutomaticPpoiStates, reconcileAutomaticPpoi } from '@/lib/mihm/automaticPpoiReconciliation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalized(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function GET() {
  const gate = await requireRootActor('root.methodology.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const state = await readAutomaticPpoiStates();
  return NextResponse.json({ ok: true, data: state });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.methodology.resolve');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = asRecord(await request.json().catch(() => ({})));
  const intent = stringValue(body.intent) ?? 'resolve';

  if (intent === 'reconcile_ppoi') {
    const result = await reconcileAutomaticPpoi();
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'methodology.reconcile_ppoi',
      target: 'institutional_methodology_queue',
      payload: { created: result.created, linked: result.linked, blocked: result.blocked, cases: result.cases.length },
      request,
    });
    return NextResponse.json({ ok: result.ok && audit.ok, data: result, audit }, { status: result.ok && audit.ok ? 200 : 500 });
  }

  const caseRow = asRecord(body.case);
  const methodology = resolveRootCaseMethodology(caseRow);
  if (intent === 'resolve') return NextResponse.json({ ok: true, data: methodology });

  // Compatibility path only. ROOT no longer exposes this as a routine founder decision.
  if (intent !== 'ensure_ppoi') {
    return NextResponse.json({ ok: false, error: 'methodology_intent_unknown' }, { status: 400 });
  }
  if (methodology.resolution.primary?.methodId !== 'PPOI') {
    return NextResponse.json({ ok: false, error: 'ppoi_not_primary_method', data: methodology }, { status: 409 });
  }
  if (methodology.resolution.status !== 'READY') {
    return NextResponse.json({ ok: false, error: 'methodology_blocked', data: methodology }, { status: 409 });
  }

  const requestedName = methodology.title.slice(0, 200);
  const existing = await canCreatePhenomenon(gate.ctx.user.id, requestedName);
  const exact = existing.find((row) => normalized(row.name) === normalized(requestedName));
  let result: Record<string, unknown>;
  if (exact) {
    result = { disposition: 'LINKED_EXISTING', phenomenon: exact, methodology };
  } else {
    const created = await openPhenomenon(gate.ctx.user.id, { name: requestedName, isCalibrationCase: false, relatedStudioObjectId: null });
    if (!created.ok) return NextResponse.json({ ok: false, error: created.error ?? 'ppoi_creation_failed', data: methodology }, { status: created.status ?? 500 });
    result = { disposition: 'CREATED', phenomenon: created.data, methodology };
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'methodology.ensure_ppoi.compatibility',
    target: methodology.caseId,
    payload: { caseId: methodology.caseId, title: methodology.title, primaryMethod: methodology.resolution.primary.methodId, disposition: result.disposition },
    request,
  });
  if (!audit.ok) return NextResponse.json({ ok: false, error: 'ppoi_persisted_but_audit_failed', data: result, audit }, { status: 500 });
  return NextResponse.json({ ok: true, data: result, audit });
}
