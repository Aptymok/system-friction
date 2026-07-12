import { NextResponse } from 'next/server';

import {
  bootstrapStudioReferenceCases,
  linkCaseEvidence,
  readReferenceBank,
  registerReferenceCase,
  type CaseEvidenceRelation,
  type ReferenceCaseStatus,
} from '@/lib/amv/referenceBank';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(request: Request) {
  const gate = await requireRootActor('root.reference_bank.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const url = new URL(request.url);
  try {
    const bank = await readReferenceBank({
      cohort: url.searchParams.get('cohort'),
      objectClass: url.searchParams.get('objectClass'),
      status: url.searchParams.get('status'),
    });
    return NextResponse.json({ ok: true, bank });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'reference_bank_read_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.reference_bank.write');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const operation = typeof body.operation === 'string' ? body.operation : 'register';

  try {
    let result: unknown;
    if (operation === 'bootstrap_studio') {
      result = await bootstrapStudioReferenceCases(gate.ctx.user.id);
    } else if (operation === 'link_evidence') {
      const relation = String(body.relationType ?? 'CONTEXTUALIZES') as CaseEvidenceRelation;
      result = await linkCaseEvidence({
        caseId: typeof body.caseId === 'string' ? body.caseId : '',
        evidenceSource: typeof body.evidenceSource === 'string' ? body.evidenceSource : '',
        evidenceId: typeof body.evidenceId === 'string' ? body.evidenceId : '',
        relationType: relation,
        note: typeof body.note === 'string' ? body.note : null,
        createdBy: gate.ctx.user.id,
      });
    } else {
      const metadata = row(body.metadata);
      result = await registerReferenceCase({
        caseCode: typeof body.caseCode === 'string' ? body.caseCode : '',
        entityId: typeof body.entityId === 'string' ? body.entityId : null,
        objectId: typeof body.objectId === 'string' ? body.objectId : '',
        objectClass: typeof body.objectClass === 'string' ? body.objectClass : 'other',
        title: typeof body.title === 'string' ? body.title : '',
        manifestation: typeof body.manifestation === 'string' ? body.manifestation : null,
        cohort: typeof body.cohort === 'string' ? body.cohort : 'unassigned',
        prospective: body.prospective !== false,
        status: (typeof body.status === 'string' ? body.status : 'REGISTERED') as ReferenceCaseStatus,
        openedAt: typeof body.openedAt === 'string' ? body.openedAt : new Date().toISOString(),
        closedAt: typeof body.closedAt === 'string' ? body.closedAt : null,
        t0Cutoff: typeof body.t0Cutoff === 'string' ? body.t0Cutoff : new Date().toISOString(),
        phaseStatus: row(body.phaseStatus),
        fieldsDocumented: strings(body.fieldsDocumented),
        missingFields: strings(body.missingFields),
        predictionRunId: typeof body.predictionRunId === 'string' ? body.predictionRunId : null,
        interventionId: typeof body.interventionId === 'string' ? body.interventionId : null,
        outcomeId: typeof body.outcomeId === 'string' ? body.outcomeId : null,
        modelKey: typeof body.modelKey === 'string' ? body.modelKey : null,
        modelVersion: typeof body.modelVersion === 'number' ? body.modelVersion : null,
        operatorId: gate.ctx.user.id,
        secondOperatorId: typeof body.secondOperatorId === 'string' ? body.secondOperatorId : null,
        consentRequired: body.consentRequired === true,
        consentEvidenceId: typeof body.consentEvidenceId === 'string' ? body.consentEvidenceId : null,
        metadata,
      });
    }

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: `root.reference_bank.${operation}`,
      target: typeof body.caseCode === 'string' ? body.caseCode : operation,
      payload: { operation, result },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, operation, result, audit }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'reference_bank_write_failed', details: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
