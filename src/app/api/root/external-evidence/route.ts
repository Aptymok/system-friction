import { NextResponse } from 'next/server';

import { readExternalEvidenceVector, recordExternalEvidence } from '@/lib/amv/externalEvidence';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

export async function GET(request: Request) {
  const gate = await requireRootActor('root.external_evidence.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const url = new URL(request.url);
  const objectId = url.searchParams.get('objectId')?.trim() ?? '';
  const objectClass = url.searchParams.get('objectClass');
  const requiredKeys = url.searchParams.getAll('requiredKey').map((item) => item.trim()).filter(Boolean);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });

  try {
    const vector = await readExternalEvidenceVector({ objectId, objectClass, requiredKeys: requiredKeys.length ? requiredKeys : undefined });
    return NextResponse.json({ ok: true, vector });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'external_evidence_read_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.external_evidence.record');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  try {
    const result = await recordExternalEvidence({
      caseId: typeof body.caseId === 'string' ? body.caseId : null,
      objectId: typeof body.objectId === 'string' ? body.objectId : '',
      objectClass: typeof body.objectClass === 'string' ? body.objectClass : 'other',
      sourceType: typeof body.sourceType === 'string' ? body.sourceType : '',
      sourceRef: typeof body.sourceRef === 'string' ? body.sourceRef : null,
      metricKey: typeof body.metricKey === 'string' ? body.metricKey : '',
      rawValue: body.rawValue ?? null,
      normalizedValue: typeof body.normalizedValue === 'number' ? body.normalizedValue : body.normalizedValue === null ? null : undefined,
      unit: typeof body.unit === 'string' ? body.unit : null,
      reliability: typeof body.reliability === 'number' ? body.reliability : Number(body.reliability),
      evidenceNote: typeof body.evidenceNote === 'string' ? body.evidenceNote : '',
      epistemicClass: body.epistemicClass === 'observed' || body.epistemicClass === 'derived' || body.epistemicClass === 'inferred' || body.epistemicClass === 'missing'
        ? body.epistemicClass
        : 'declared',
      capturedAt: typeof body.capturedAt === 'string' ? body.capturedAt : new Date().toISOString(),
      operatorId: gate.ctx.user.id,
      consentEvidenceId: typeof body.consentEvidenceId === 'string' ? body.consentEvidenceId : null,
      payload: body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload as Record<string, unknown> : {},
    });

    const vector = await readExternalEvidenceVector({
      objectId: result.observation.objectId,
      objectClass: result.observation.objectClass,
      requiredKeys: stringArray(body.requiredKeys).length ? stringArray(body.requiredKeys) : undefined,
    });
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'root.external_evidence.record',
      target: result.observation.objectId,
      payload: {
        observationId: result.observation.id,
        metricKey: result.observation.metricKey,
        epistemicClass: result.observation.epistemicClass,
        reliability: result.observation.reliability,
        evidenceHash: result.evidenceHash,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, ...result, vector, audit }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'external_evidence_record_failed', details: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
