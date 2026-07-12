import { NextResponse } from 'next/server';

import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maximum = 2000): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maximum)
    : null;
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.amv.consent.record');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const objectId = text(body.objectId, 200);
  const evidenceNote = text(body.evidenceNote);
  const evidenceId = text(body.evidenceId, 300);
  const scope = text(body.scope, 1000);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });
  if (!evidenceNote || evidenceNote.length < 12) {
    return NextResponse.json({ ok: false, error: 'consent_evidence_note_required' }, { status: 400 });
  }
  if (body.documented !== true) {
    return NextResponse.json({ ok: false, error: 'explicit_consent_confirmation_required' }, { status: 400 });
  }

  const service = createServiceSupabaseClient();
  const current = await service
    .from('studio_objects')
    .select('id,title,object_type,metadata')
    .eq('id', objectId)
    .maybeSingle();
  if (current.error || !current.data) {
    return NextResponse.json({ ok: false, error: 'studio_object_not_found', details: current.error?.message ?? objectId }, { status: 404 });
  }

  const recordedAt = new Date().toISOString();
  const metadata = {
    ...record(current.data.metadata),
    amvConsent: {
      documented: true,
      evidenceId,
      evidenceNote,
      scope,
      recordedAt,
      recordedBy: gate.ctx.user.id,
    },
  };
  const update = await service
    .from('studio_objects')
    .update({ metadata, updated_at: recordedAt })
    .eq('id', objectId);
  if (update.error) {
    return NextResponse.json({ ok: false, error: 'consent_update_failed', details: update.error.message }, { status: 400 });
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'root.amv.consent.record',
    target: objectId,
    payload: {
      objectId,
      objectTitle: current.data.title ?? null,
      objectType: current.data.object_type ?? null,
      evidenceId,
      evidenceNote,
      scope,
      recordedAt,
    },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: true,
    objectId,
    objectTitle: current.data.title ?? null,
    consent: metadata.amvConsent,
    audit,
  }, { status: 201 });
}
