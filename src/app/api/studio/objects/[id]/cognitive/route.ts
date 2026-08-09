import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { runStudioCognitiveRuntime, type StudioCognitiveAction } from '@/lib/studio/cognitive/studioCognitiveRuntime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);
  try {
    const access = await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action ?? 'analyze') as StudioCognitiveAction;
    if (!['analyze', 'generate_hypothesis', 'verify'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'INVALID_COGNITIVE_ACTION' }, { status: 400 });
    }
    const result = await runStudioCognitiveRuntime({ ownerId: access.user.id, objectId, action });
    if (!result.ok) return NextResponse.json(result, { status: result.status });
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: 'STUDIO_COGNITIVE_RUNTIME_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
