import { NextResponse } from 'next/server';

import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function modelIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function POST(request: Request, ctx: RouteContext) {
  const gate = await requireRootActor('root.predictive_model.promote');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: 'explicit_confirmation_required' }, { status: 400 });
  }

  const modelId = await modelIdFrom(ctx);
  const service = createServiceSupabaseClient();
  const before = await service.from('sfi_predictive_models').select('id,scope,model_key,version,status,verified_sample_count,metrics').eq('id', modelId).maybeSingle();
  if (before.error || !before.data) {
    return NextResponse.json({ ok: false, error: 'predictive_model_not_found', details: before.error?.message ?? modelId }, { status: 404 });
  }

  const promoted = await service.rpc('promote_sfi_predictive_model', {
    p_model_id: modelId,
    p_actor_id: gate.ctx.user.id,
  });
  if (promoted.error || !promoted.data) {
    return NextResponse.json({ ok: false, error: 'predictive_model_promotion_blocked', details: promoted.error?.message ?? 'unknown' }, { status: 409 });
  }

  const newModelId = String(promoted.data);
  const after = await service.from('sfi_predictive_models').select('id,scope,model_key,version,status,verified_sample_count,metrics,parent_model_id,created_at').eq('id', newModelId).maybeSingle();
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'root.predictive_model.promote',
    target: modelId,
    payload: { previous: before.data, promotedModelId: newModelId, promoted: after.data ?? null },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ok: true, previous: before.data, promoted: after.data ?? { id: newModelId }, audit }, { status: 201 });
}
