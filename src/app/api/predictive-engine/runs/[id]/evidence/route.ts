import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';
import { fulfillPredictiveEvidence } from '@/lib/predictive-engine/evidence';
import { getPredictiveRun } from '@/lib/predictive-engine/service';

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
    const evidenceKey = text(body.evidenceKey, 160);
    const source = text(body.source, 240);
    if (!evidenceKey || !source) return NextResponse.json({ ok: false, error: 'EVIDENCE_KEY_AND_SOURCE_REQUIRED' }, { status: 400 });
    const trusts = new Set(['VERIFIED', 'OBSERVED', 'DECLARED', 'INFERRED', 'UNKNOWN']);
    const trust = trusts.has(String(body.trust)) ? String(body.trust) as 'VERIFIED' | 'OBSERVED' | 'DECLARED' | 'INFERRED' | 'UNKNOWN' : 'DECLARED';
    const featureValue = body.featureValue === null || typeof body.featureValue === 'undefined' ? null : numeric(body.featureValue);
    const featureConfidence = body.featureConfidence === null || typeof body.featureConfidence === 'undefined' ? null : numeric(body.featureConfidence);
    if (featureValue !== null && (featureValue < 0 || featureValue > 1)) {
      return NextResponse.json({ ok: false, error: 'FEATURE_VALUE_OUT_OF_RANGE' }, { status: 400 });
    }
    if (featureConfidence !== null && (featureConfidence < 0 || featureConfidence > 1)) {
      return NextResponse.json({ ok: false, error: 'FEATURE_CONFIDENCE_OUT_OF_RANGE' }, { status: 400 });
    }
    const result = await fulfillPredictiveEvidence({
      runId,
      evidenceKey,
      source,
      trust,
      evidenceValue: body.evidenceValue,
      featureValue,
      featureConfidence,
      sourceRef: text(body.sourceRef, 1000),
      observedAt: text(body.observedAt, 80),
      ownerId: ownerId ?? access.user.id,
      createdBy: access.user.id,
    });
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PREDICTIVE_EVIDENCE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
