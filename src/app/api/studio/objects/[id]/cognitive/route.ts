import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { runStudioCognitiveRuntime, type StudioCognitiveAction } from '@/lib/studio/cognitive/studioCognitiveRuntime';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

async function objectAndAccess(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);
  const access = await requireObjectOwner(objectId);
  return { objectId, access };
}

export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const { objectId, access } = await objectAndAccess(ctx);
    const db = createServiceSupabaseClient();
    const result = await db.from('studio_evidence_traces')
      .select('id,label,source,payload,created_at')
      .eq('object_id', objectId)
      .eq('owner_id', access.user.id)
      .eq('source', 'studio_cognitive_runtime_v1')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) return NextResponse.json({ ok: false, error: 'COGNITIVE_STATE_READ_FAILED', details: result.error.message }, { status: 503 });
    return NextResponse.json({ ok: true, objectId, trace: result.data ?? null });
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: 'STUDIO_COGNITIVE_STATE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  try {
    const { objectId, access } = await objectAndAccess(ctx);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action ?? 'analyze') as StudioCognitiveAction;
    if (!['analyze', 'generate_hypothesis', 'verify'].includes(action)) return NextResponse.json({ ok: false, error: 'INVALID_COGNITIVE_ACTION' }, { status: 400 });
    const result = await runStudioCognitiveRuntime({ ownerId: access.user.id, objectId, action });
    if (!result.ok) return NextResponse.json(result, { status: result.status });
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: 'STUDIO_COGNITIVE_RUNTIME_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
