import { NextResponse } from 'next/server';
import { auditRootAction, asRecord, requireRootActor, requireRootViewer, stringValue } from '@/lib/root/server';
import { SFI_INSTITUTIONAL_ATTRACTOR_KEY } from '@/lib/institution/institutionalAttractor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXPERIMENT_KEY = 'SFI-INSTITUTIONAL-30D-001';

export async function GET() {
  const gate = await requireRootViewer('root.attractor.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const [attractor, experiment] = await Promise.all([
    gate.ctx.service.from('sfi_attractors').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).maybeSingle(),
    gate.ctx.service.from('sfi_institutional_experiments').select('*').eq('experiment_key', EXPERIMENT_KEY).maybeSingle(),
  ]);

  return NextResponse.json({
    ok: true,
    attractor: attractor.data ?? null,
    experiment: experiment.data ?? null,
    warnings: [attractor.error?.message, experiment.error?.message].filter(Boolean),
    canEdit: gate.ctx.isRoot,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  const gate = await requireRootActor('attractor.configure');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  const action = stringValue(body.action);

  if (action === 'update_attractor') {
    const current = await gate.ctx.service.from('sfi_attractors').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).maybeSingle();
    if (current.error) return NextResponse.json({ ok: false, error: current.error.message }, { status: 400 });

    const label = stringValue(body.label) ?? stringValue(current.data?.label) ?? 'Reorganización contextual persistente';
    const desiredState = stringValue(body.desiredState);
    const mechanism = stringValue(body.mechanism);
    const normativePosition = stringValue(body.normativePosition);
    const claimBoundary = stringValue(body.claimBoundary);
    if (!desiredState) return NextResponse.json({ ok: false, error: 'desired_state_required' }, { status: 400 });

    const vector = {
      ...asRecord(current.data?.vector),
      epistemicClass: 'DECLARED',
      authoritySource: 'FOUNDER',
      declarationRecorded: true,
      desiredState,
      ...(mechanism ? { mechanism } : {}),
      ...(normativePosition ? { normativePosition } : {}),
      ...(claimBoundary ? { claimBoundary } : {}),
      lastDeclaredEditAt: new Date().toISOString(),
      lastDeclaredEditBy: gate.ctx.user.id,
    };

    const payload = {
      attractor_key: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
      label,
      module: 'institution',
      owner_node_key: 'SFI-INSTITUTION',
      attractor_type: 'declared_institutional',
      status: 'declared',
      vector,
      updated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    const write = current.data
      ? await gate.ctx.service.from('sfi_attractors').update(payload).eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).select('*').single()
      : await gate.ctx.service.from('sfi_attractors').insert({ ...payload, density: 0, confidence: 0, persistence: 0, trust: 0, degradation: 0, weight: 0, evidence_count: 0, first_seen: new Date().toISOString() }).select('*').single();

    if (write.error) return NextResponse.json({ ok: false, error: write.error.message }, { status: 400 });
    const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'attractor.configure', target: SFI_INSTITUTIONAL_ATTRACTOR_KEY, payload: { changed: ['label','desiredState','mechanism','normativePosition','claimBoundary'], epistemicClass: 'DECLARED' }, request: req });
    return NextResponse.json({ ok: audit.ok, attractor: write.data, audit });
  }

  if (action === 'set_experiment_mode') {
    const status = stringValue(body.status);
    if (!status || !['READY','ACTIVE','PAUSED','COMPLETED','CANCELLED'].includes(status)) {
      return NextResponse.json({ ok: false, error: 'invalid_experiment_status' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === 'ACTIVE') {
      patch.operating_mode = 'FOUNDER_ABSENT';
      patch.activated_by = gate.ctx.user.id;
      patch.activated_at = now;
    }
    const write = await gate.ctx.service.from('sfi_institutional_experiments').update(patch).eq('experiment_key', EXPERIMENT_KEY).select('*').maybeSingle();
    if (write.error) return NextResponse.json({ ok: false, error: write.error.message, hint: 'Apply migration 20260808023000_sfi_founderless_experiment.sql first.' }, { status: 400 });
    if (!write.data) return NextResponse.json({ ok: false, error: 'experiment_row_missing', hint: 'Apply migration 20260808023000_sfi_founderless_experiment.sql first.' }, { status: 404 });
    const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'experiment.mode.configure', target: EXPERIMENT_KEY, payload: { status, operatingMode: write.data.operating_mode, epistemicClass: 'DECLARED' }, request: req });
    return NextResponse.json({ ok: audit.ok, experiment: write.data, audit });
  }

  return NextResponse.json({ ok: false, error: 'unsupported_action' }, { status: 400 });
}
