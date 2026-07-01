import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { getPredictionEntry } from '@/lib/sfi/predictions/service';
import { createVerificationRule, listVerificationsForPrediction } from '@/lib/sfi/predictions/verificationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ hypothesisId: string }> | { hypothesisId: string };
};

async function routeHypothesisId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.hypothesisId === 'string' && params.hypothesisId.trim().length > 0
    ? decodeURIComponent(params.hypothesisId.trim())
    : null;
}

async function requireRoot(action: string) {
  try {
    return await requireRootActor(action);
  } catch (error) {
    return {
      ok: false as const,
      status: 503,
      body: {
        ok: false,
        error: 'root_auth_unavailable',
        details: error instanceof Error ? error.message : 'unknown_root_auth_error',
      },
    };
  }
}

export async function GET(_request: Request, ctx: RouteContext) {
  const gate = await requireRoot('sfi.predictions.verifications.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const hypothesisId = await routeHypothesisId(ctx);
  if (!hypothesisId) return NextResponse.json({ ok: false, error: 'missing_hypothesis_id' }, { status: 400 });

  const prediction = await getPredictionEntry(hypothesisId);
  if (!prediction.ok) return NextResponse.json(prediction, { status: prediction.status ?? 400 });

  const result = await listVerificationsForPrediction(prediction.data.id);
  if (!result.ok) return NextResponse.json(result, { status: result.status ?? 400 });

  return NextResponse.json({ ok: true, verifications: result.data, private: true });
}

export async function POST(request: Request, ctx: RouteContext) {
  const gate = await requireRoot('sfi.predictions.verifications.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const hypothesisId = await routeHypothesisId(ctx);
  if (!hypothesisId) return NextResponse.json({ ok: false, error: 'missing_hypothesis_id' }, { status: 400 });

  const prediction = await getPredictionEntry(hypothesisId);
  if (!prediction.ok) return NextResponse.json(prediction, { status: prediction.status ?? 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const result = await createVerificationRule({
    prediction_entry_id: prediction.data.id,
    hypothesis_id: prediction.data.hypothesis_id,
    return_window: record.return_window as never,
    verification_rule: record.verification_rule as never,
    ground_truth_source_type: String(record.ground_truth_source_type ?? ''),
    ground_truth_source_url: typeof record.ground_truth_source_url === 'string' ? record.ground_truth_source_url : null,
    ground_truth_source_query: typeof record.ground_truth_source_query === 'string' ? record.ground_truth_source_query : null,
    source_quality_tier: record.source_quality_tier as never,
  });

  if (!result.ok) return NextResponse.json(result, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true, verification: result.data, private: true });
}