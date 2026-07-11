import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { analyzeStudioModalityObject } from '@/lib/studio/multimodal/analyzeStudioModalityObject';
import { analyzeStudioVideo } from '@/lib/studio/multimodal/videoAnalyzer';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    const context = await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as { force?: unknown };
    const result = await analyzeStudioModalityObject(objectId, {
      expectedModalities: ['video'],
      force: body.force === true,
      requestedByUserId: context.user.id,
      analyze: async ({ bytes, extension }) => ({
        ...(await analyzeStudioVideo(bytes, extension)),
        table: 'studio_video_features',
      }),
    });
    const reused = Boolean((result as Record<string, unknown>).reused);
    return NextResponse.json(result, { status: reused ? 200 : 202 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const payload = toStudioMultimodalApiError(error);
    const status = error instanceof StudioMultimodalError ? error.status : 500;
    return NextResponse.json(payload, { status });
  }
}
