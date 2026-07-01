import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { closeVerification } from '@/lib/sfi/predictions/verificationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params:
    | Promise<{ hypothesisId: string; verificationId: string }>
    | { hypothesisId: string; verificationId: string };
};

async function routeVerificationId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.verificationId === 'string' && params.verificationId.trim().length > 0
    ? decodeURIComponent(params.verificationId.trim())
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

export async function PATCH(request: Request, ctx: RouteContext) {
  const gate = await requireRoot('sfi.predictions.verifications.close');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const verificationId = await routeVerificationId(ctx);
  if (!verificationId) return NextResponse.json({ ok: false, error: 'missing_verification_id' }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const result = await closeVerification({
    id: verificationId,
    evaluation_result: record.evaluation_result as never,
    source_snapshot_hash: typeof record.source_snapshot_hash === 'string' ? record.source_snapshot_hash : null,
    source_value: record.source_value,
    evaluation_confidence: typeof record.evaluation_confidence === 'number' ? record.evaluation_confidence : null,
    evidence_state_after_verification: record.evidence_state_after_verification as never,
    verification_notes: typeof record.verification_notes === 'string' ? record.verification_notes : null,
    verified_by: typeof record.verified_by === 'string' ? record.verified_by : null,
  });

  if (!result.ok) return NextResponse.json(result, { status: result.status ?? 400 });
  return NextResponse.json({ ok: true, verification: result.data, private: true });
}

export async function POST(request: Request, ctx: RouteContext) {
  return PATCH(request, ctx);
}