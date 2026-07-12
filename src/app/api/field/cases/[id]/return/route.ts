import { NextResponse } from 'next/server';
import { submitFieldReturn } from '@/lib/field/operationalCycle';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, maximum = 6000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function number01(value: unknown, fallback = 0.5) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { id } = await Promise.resolve(context.params);
    const caseId = decodeURIComponent(id);
    const body = record(await request.json().catch(() => null));
    const result = await submitFieldReturn(user.id, caseId, {
      evidenceNote: text(body.evidenceNote),
      evidenceSource: text(body.evidenceSource, 180) || 'participant_return',
      evidenceUri: text(body.evidenceUri, 1000) || null,
      reliability: number01(body.reliability, 0.5),
      actualOutcome: number01(body.actualOutcome, 0),
      interventionFidelity: number01(body.interventionFidelity, 0.5),
      observedAt: text(body.observedAt, 80) || null,
    });
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('_REQUIRED') ? 400 : details.includes('NOT_FOUND') ? 404 : 500;
    return NextResponse.json({ ok: false, error: 'FIELD_RETURN_FAILED', details }, { status });
  }
}
