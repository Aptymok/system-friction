import { NextResponse } from 'next/server';
import { acknowledgeFieldInterventionExecution } from '@/lib/field/interventionExecution';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, max = 6000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function requiredNumber01(value: unknown, field: string): number {
  if (value === null || typeof value === 'undefined' || value === '') throw new Error(`${field}_REQUIRED`);
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error(`${field}_INVALID`);
  return parsed;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { id } = await Promise.resolve(context.params);
    const caseId = decodeURIComponent(id).trim();
    if (!caseId) return NextResponse.json({ ok: false, error: 'missing_case_id' }, { status: 400 });
    const body = record(await request.json().catch(() => null));
    const result = await acknowledgeFieldInterventionExecution({
      ownerId: user.id,
      caseId,
      executionNote: text(body.executionNote),
      executionSource: text(body.executionSource, 180) || 'participant_execution_declaration',
      reliability: requiredNumber01(body.reliability, 'FIELD_INTERVENTION_EXECUTION_RELIABILITY'),
      executedAt: text(body.executedAt, 80) || null,
    });
    return NextResponse.json({ ok: true, result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('_REQUIRED') || details.includes('_INVALID') || details.includes('_NOT_READY') || details.includes('_ACK_REQUIRED') || details.includes('_CONTRACT_NOT_ENABLED')
      ? 400
      : details.includes('NOT_FOUND')
        ? 404
        : details.includes('ALREADY_CLAIMED')
          ? 409
          : 500;
    return NextResponse.json({ ok: false, error: 'FIELD_INTERVENTION_EXECUTION_ACK_FAILED', details }, { status });
  }
}
