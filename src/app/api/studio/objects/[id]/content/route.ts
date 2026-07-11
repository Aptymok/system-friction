import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createStudioContentSignedUrl } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const objectId = decodeURIComponent(params.id);
  try {
    await requireObjectOwner(objectId);
    const signedUrl = await createStudioContentSignedUrl(objectId, 120);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const body = toStudioMultimodalApiError(error);
    const status = error instanceof StudioMultimodalError ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
