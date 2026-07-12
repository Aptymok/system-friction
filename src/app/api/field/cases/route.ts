import { NextResponse } from 'next/server';
import { createFieldCycle, listFieldCycles, type FieldVerificationWindow } from '@/lib/field/operationalCycle';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, maximum = 6000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function number01(value: unknown, fallback = 0.5) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function windowValue(value: unknown): FieldVerificationWindow {
  return value === '7d' || value === '30d' ? value : '72h';
}

function failure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = details.includes('_REQUIRED') || details.includes('_INVALID') || details.includes('_NOT_OPEN') || details.includes('_NOT_READY')
    ? 400
    : details.includes('NOT_FOUND')
      ? 404
      : 500;
  return NextResponse.json({ ok: false, error: 'FIELD_CYCLE_FAILED', details }, { status });
}

function withReturnAvailability(value: unknown) {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  return value.map((item) => {
    const row = record(item);
    const metadata = record(row.metadata);
    const expectedAt = typeof metadata.expectedAt === 'string' ? new Date(metadata.expectedAt).getTime() : Number.NaN;
    const persistedStatus = text(row.status, 80) || 'UNKNOWN';
    const returnAvailable = persistedStatus === 'WAITING_RETURN' && Number.isFinite(expectedAt) && now >= expectedAt;
    return {
      ...row,
      persisted_status: persistedStatus,
      status: persistedStatus === 'WAITING_RETURN' && !returnAvailable ? 'SEALED_WINDOW_ACTIVE' : persistedStatus,
      return_available: returnAvailable,
    };
  });
}

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const result = await listFieldCycles(user.id);
    return NextResponse.json({ ok: true, ...result, cases: withReturnAvailability(result.cases) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const result = await createFieldCycle(user.id, {
      title: text(body.title, 180),
      domain: text(body.domain, 80) || 'other',
      stuckSystem: text(body.stuckSystem),
      objective: text(body.objective),
      attempts: text(body.attempts),
      evidence: text(body.evidence),
      consequence: text(body.consequence),
      declaredAttractor: text(body.declaredAttractor),
      evidenceSource: text(body.evidenceSource, 180) || 'participant_declared',
      evidenceUri: text(body.evidenceUri, 1000) || null,
      reliability: number01(body.reliability, 0.45),
      verificationWindow: windowValue(body.verificationWindow),
      consent: body.consent === true,
    });
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
