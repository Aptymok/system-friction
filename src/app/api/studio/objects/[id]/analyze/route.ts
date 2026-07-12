import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { resolveStudioObjectDescriptor } from '@/lib/studio/multimodal/analyzeStudioModalityObject';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    await requireObjectOwner(objectId);
    const { descriptor } = await resolveStudioObjectDescriptor(objectId);
    const segment = descriptor.modality === 'community' || descriptor.modality === 'time_coordinate'
      ? 'structured'
      : descriptor.modality;

    if (!['audio', 'text', 'image', 'video', 'structured'].includes(segment)) {
      throw new StudioMultimodalError(
        'UNSUPPORTED_FILE_TYPE',
        'Studio cannot route an unknown object modality to an analyzer.',
        415,
        { objectId, modality: descriptor.modality },
      );
    }

    const target = new URL(request.url);
    target.pathname = `${target.pathname}/${segment}`;
    return NextResponse.redirect(target, 307);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const body = toStudioMultimodalApiError(error);
    const status = error instanceof StudioMultimodalError ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
