import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';
import { registerGovernedPredictiveOutcome } from '@/lib/predictive-engine/governedOutcome';
import { getPredictiveRun } from '@/lib/predictive-engine/service';
import type { PredictiveReturnWindow } from '@/lib/predictive-engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, maximum = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : null;
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function returnWindow(value: unknown): PredictiveReturnWindow {
  return value === '72h' || value === '7d' || value === '90d' ? value : '30d';
}

async function runIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function POST(request: Request, ctx: RouteContext) {
  try {
    const access = await requireAuthenticatedUser();
    const runId = await runIdFrom(ctx);
    const current = await getPredictiveRun(runId);
    const ownerId = typeof current.run.owner_id === 'string' ? current.run.owner_id : null;
    if (ownerId && ownerId !== access.user.id) await requireFounder();

    const body = record(await request.json().catch(() => null));
    const sourceType = text(body.sourceType, 240);
    if (!sourceType) return NextResponse.json({ ok: false, error: 'OUTCOME_SOURCE_REQUIRED' }, { status: 400 });
    const actualValue = body.actualValue === null || typeof body.actualValue === 'undefined' ? null : numeric(body.actualValue);
    if (actualValue !== null && (actualValue < 0 || actualValue > 1)) {
      return NextResponse.json({ ok: false, error: 'OUTCOME_VALUE_OUT_OF_RANGE' }, { status: 400 });
    }
    const qualities = new Set(['VERIFIED', 'OBSERVED', 'DECLARED', 'INFERRED', 'UNVERIFIABLE']);
    const sourceQuality = qualities.has(String(body.sourceQuality)) ? String(body.sourceQuality) as 'VERIFIED' | 'OBSERVED' | 'DECLARED' | 'INFERRED' | 'UNVERIFIABLE' : 'DECLARED';
    const interventionFidelity = body.interventionFidelity === null || typeof body.interventionFidelity === 'undefined' ? null : numeric(body.interventionFidelity);
    if (interventionFidelity !== null && (interventionFidelity < 0 || interventionFidelity > 1)) {
      return NextResponse.json({ ok: false, error: 'INTERVENTION_FIDELITY_OUT_OF_RANGE' }, { status: 400 });
    }

    const result = await registerGovernedPredictiveOutcome({
      runId,
      returnWindow: returnWindow(body.returnWindow ?? current.run.requested_return_window),
      actualValue,
      outcomePayload: record(body.outcomePayload),
      sourceType,
      sourceRef: text(body.sourceRef, 1000),
      sourceQuality,
      interventionFidelity,
      observedAt: text(body.observedAt, 80),
      createdBy: access.user.id,
    });
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: 'PREDICTIVE_OUTCOME_FAILED', details: message }, { status: 500 });
  }
}
